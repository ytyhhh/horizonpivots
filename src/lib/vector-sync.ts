import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createEmbeddings,
  embeddingContentHash,
  isEmbeddingConfigured,
  jobEmbeddingText,
  profileEmbeddingText,
  SILICONFLOW_EMBEDDING_MODEL,
} from "@/lib/embeddings";
import type { CandidateProfile, Job } from "@/types";

const EMBEDDING_BATCH_SIZE = 16;

function configuredModel() {
  return process.env.SILICONFLOW_EMBEDDING_MODEL ?? SILICONFLOW_EMBEDDING_MODEL;
}

function chunks<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

/**
 * Persists vectors only after the corresponding job rows are safely written.
 * A provider outage deliberately does not fail job ingestion: it leaves rows
 * without vectors, which the rebuild endpoint can retry later.
 */
export async function syncJobEmbeddings(admin: SupabaseClient, jobs: Job[]) {
  if (!isEmbeddingConfigured() || !jobs.length) return { attempted: 0, updated: 0 };

  const unique = Array.from(new Map(jobs.map((job) => [job.id, job])).values());
  const { data, error } = await admin
    .from("jobs")
    .select("id, embedding_source_hash, embedding_model")
    .in(
      "id",
      unique.map((job) => job.id),
    );
  if (error) throw error;

  const saved = new Map(
    (data ?? []).map((row) => [
      String(row.id),
      {
        hash: (row.embedding_source_hash as string | null) ?? null,
        model: (row.embedding_model as string | null) ?? null,
      },
    ]),
  );
  const model = configuredModel();
  const pending = unique.filter((job) => {
    const current = saved.get(job.id);
    return current && (current.hash !== embeddingContentHash(jobEmbeddingText(job)) || current.model !== model);
  });

  let updated = 0;
  for (const batch of chunks(pending, EMBEDDING_BATCH_SIZE)) {
    const texts = batch.map(jobEmbeddingText);
    const vectors = await createEmbeddings(texts);
    await Promise.all(
      batch.map(async (job, index) => {
        const text = texts[index];
        const { error: updateError } = await admin
          .from("jobs")
          .update({
            embedding: vectors[index],
            embedding_content_hash: embeddingContentHash(text),
            embedding_source_hash: embeddingContentHash(text),
            embedding_model: model,
            embedded_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        if (updateError) throw updateError;
      }),
    );
    updated += batch.length;
  }
  return { attempted: pending.length, updated };
}

export async function syncProfileEmbedding(
  admin: SupabaseClient,
  userId: string,
  profile: CandidateProfile,
) {
  if (!isEmbeddingConfigured()) return false;
  const text = profileEmbeddingText(profile);
  const hash = embeddingContentHash(text);
  const model = configuredModel();
  const { data, error } = await admin
    .from("candidate_profiles")
    .select("embedding_source_hash, embedding_model")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data?.embedding_source_hash === hash && data.embedding_model === model) return false;

  const [embedding] = await createEmbeddings([text]);
  const { error: updateError } = await admin
    .from("candidate_profiles")
    .update({
      embedding,
      embedding_content_hash: hash,
      embedding_source_hash: hash,
      embedding_model: model,
      embedded_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (updateError) throw updateError;
  await admin.from("recommendation_cache").delete().eq("user_id", userId);
  return true;
}

export function jobFromEmbeddingRow(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    company: String(row.company),
    title: String(row.title),
    program: (row.program as string | null) ?? null,
    type: row.job_type as Job["type"],
    batch: String(row.batch),
    industry: row.industry as Job["industry"],
    locations: (row.locations as string[]) ?? [],
    cohort: String(row.cohort),
    skills: (row.skills as string[]) ?? [],
    summary: String(row.summary ?? ""),
    description: String(row.description ?? ""),
    deadline: (row.deadline as string | null) ?? null,
    applyUrl: (row.apply_url as string | null) ?? null,
    sourceUrl: String(row.source_url),
    sourceName: String(row.source_name),
    sourceConfidence: row.source_confidence as Job["sourceConfidence"],
    firstSeen: String(row.first_seen),
    lastSeen: String(row.last_seen),
    updatedAt: (row.updated_at as string | null) ?? null,
    status: row.status as Job["status"],
    fingerprint: String(row.fingerprint),
    cuhkShenzhenOnly: Boolean(row.cuhk_shenzhen_only),
  };
}

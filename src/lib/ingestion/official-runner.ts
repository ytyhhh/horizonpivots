import { createHash, randomUUID } from "node:crypto";
import { adapters, type DiscoveredPage } from "@/lib/ingestion/adapters";
import {
  extractOfficialJobsFromPage,
  officialExtractionToJob,
  type OfficialSourceRecord,
} from "@/lib/ingestion/official-extraction";
import { fetchSafeText } from "@/lib/ingestion/web-safety";
import { toJobRow } from "@/lib/ingestion/xixicc";
import { createAdminClient } from "@/lib/supabase/admin";

const SOURCE_BATCH_SIZE = 5;
const PAGE_CONCURRENCY = 5;
const MAX_PAGES_PER_SOURCE = 200;
const MAX_JOBS_PER_SOURCE = 500;

export function sourceContentHash(job: ReturnType<typeof officialExtractionToJob>) {
  return createHash("sha256").update(JSON.stringify({
    company: job.company,
    title: job.title,
    type: job.type,
    locations: job.locations,
    cohort: job.cohort,
    summary: job.summary,
    description: job.description,
    deadline: job.deadline,
    applyUrl: job.applyUrl,
  })).digest("hex");
}

interface DatabaseSource extends OfficialSourceRecord {
  kind: "rss" | "html" | "sitemap";
  enabled: boolean;
  consecutive_failures: number;
  fetch_mode: "auto" | "http" | "browser";
  browser_pending: boolean;
}

async function mapWithConcurrency<T, R>(values: T[], mapper: (value: T) => Promise<R>) {
  const results = new Array<R>(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(PAGE_CONCURRENCY, values.length) }, worker));
  return results;
}

function pageReviewKey(url: string) {
  return `official-page:${createHash("sha256").update(url).digest("hex").slice(0, 32)}`;
}

export async function markMissingJobs(
  admin: ReturnType<typeof createAdminClient>,
  sourceId: string,
  seenIds: Set<string>,
) {
  const { data, error } = await admin
    .from("jobs")
    .select("id, missing_count, status")
    .eq("source_id", sourceId)
    .in("status", ["active", "stale"]);
  if (error) throw error;
  const groups = new Map<string, string[]>();
  for (const row of data ?? []) {
    if (seenIds.has(String(row.id))) continue;
    const missingCount = Number(row.missing_count ?? 0) + 1;
    const status = missingCount >= 3 ? "stale" : String(row.status);
    const key = `${missingCount}:${status}`;
    groups.set(key, [...(groups.get(key) ?? []), String(row.id)]);
  }
  for (const [key, ids] of groups) {
    const [missingCount, status] = key.split(":");
    const { error: updateError } = await admin
      .from("jobs")
      .update({ missing_count: Number(missingCount), status })
      .in("id", ids);
    if (updateError) throw updateError;
  }
}

async function crawlSource(admin: ReturnType<typeof createAdminClient>, source: DatabaseSource) {
  const runId = randomUUID();
  await admin.from("ingestion_runs").insert({ id: runId, source_id: source.id, status: "running" });
  try {
    const discovered = await adapters[source.kind].discover(source.url);
    const pages = new Map<string, DiscoveredPage>();
    if (source.kind === "html") pages.set(source.url, { url: source.url, title: source.name });
    discovered.slice(0, MAX_PAGES_PER_SOURCE - pages.size).forEach((page) => pages.set(page.url, page));
    let reviewed = 0;
    const pageResults = await mapWithConcurrency([...pages.values()], async (page) => {
      try {
        const html = await fetchSafeText(page.url);
        const jobs = await extractOfficialJobsFromPage(html, page.url, source);
        if (!jobs.length && source.kind !== "html") {
          const { error } = await admin.from("review_items").upsert(
            {
              source_id: source.id,
              review_key: pageReviewKey(page.url),
              reason: "官方页面未产生通过证据校验的岗位",
              confidence: 0.5,
              payload: { url: page.url, title: page.title, source: source.name },
              status: "open",
            },
            { onConflict: "review_key", ignoreDuplicates: true },
          );
          if (error) throw error;
          reviewed += 1;
        }
        return jobs.map((job) => officialExtractionToJob(job, page.url, source));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Page crawl failed";
        const { error: reviewError } = await admin.from("review_items").upsert(
          {
            source_id: source.id,
            review_key: pageReviewKey(page.url),
            reason: message.slice(0, 500),
            confidence: 0.25,
            payload: { url: page.url, title: page.title, source: source.name },
            status: "open",
          },
          { onConflict: "review_key", ignoreDuplicates: true },
        );
        if (reviewError) throw reviewError;
        reviewed += 1;
        return [];
      }
    });
    const uniqueJobs = new Map<string, ReturnType<typeof officialExtractionToJob>>();
    pageResults.flat().forEach((job) => uniqueJobs.set(job.fingerprint, job));
    const jobs = [...uniqueJobs.values()].slice(0, MAX_JOBS_PER_SOURCE);
    const browserFallback = source.kind === "html" && jobs.length === 0 && source.fetch_mode !== "http";

    const existing = new Map<string, { id: string; firstSeen: string; contentHash: string | null }>();
    for (let index = 0; index < jobs.length; index += 100) {
      const fingerprints = jobs.slice(index, index + 100).map((job) => job.fingerprint);
      const { data, error } = await admin
        .from("jobs")
        .select("id,fingerprint,first_seen,source_content_hash")
        .in("fingerprint", fingerprints);
      if (error) throw error;
      (data ?? []).forEach((row) => existing.set(String(row.fingerprint), {
        id: String(row.id),
        firstSeen: String(row.first_seen),
        contentHash: row.source_content_hash ? String(row.source_content_hash) : null,
      }));
    }

    const seenIds = new Set<string>();
    const unchangedIds: string[] = [];
    const changedJobs = jobs.filter((job) => {
      const row = existing.get(job.fingerprint);
      const hash = sourceContentHash(job);
      if (row?.contentHash === hash) {
        unchangedIds.push(row.id);
        seenIds.add(row.id);
        return false;
      }
      return true;
    });
    for (let index = 0; index < unchangedIds.length; index += 100) {
      const { error } = await admin.from("jobs").update({
        last_seen: new Date().toISOString().slice(0, 10),
        last_seen_run_id: runId,
        missing_count: 0,
      }).in("id", unchangedIds.slice(index, index + 100));
      if (error) throw error;
    }
    const contentUpdatedAt = new Date().toISOString();
    for (let index = 0; index < changedJobs.length; index += 100) {
      const rows = changedJobs.slice(index, index + 100).map((job) => ({
        ...toJobRow({ ...job, firstSeen: existing.get(job.fingerprint)?.firstSeen ?? job.firstSeen }),
        source_id: source.id,
        source_item_key: job.sourceItemKey,
        extraction_method: job.extractionMethod,
        evidence: job.evidence,
        last_seen_run_id: runId,
        missing_count: 0,
        source_content_hash: sourceContentHash(job),
        content_updated_at: contentUpdatedAt,
        embedding: null,
        embedding_source_hash: null,
        embedding_model: null,
        embedded_at: null,
      }));
      const { data, error } = await admin
        .from("jobs")
        .upsert(rows, { onConflict: "fingerprint" })
        .select("id");
      if (error) throw error;
      (data ?? []).forEach((row) => seenIds.add(String(row.id)));
    }
    if (!browserFallback) await markMissingJobs(admin, source.id, seenIds);

    const created = jobs.filter((job) => !existing.has(job.fingerprint)).length;
    const updated = changedJobs.length - created;
    const finishedAt = new Date();
    await admin.from("sources").update({
      last_run_at: finishedAt.toISOString(),
      last_success_at: finishedAt.toISOString(),
      next_run_at: new Date(finishedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      health: "healthy",
      consecutive_failures: 0,
      last_error: null,
      browser_pending: browserFallback,
      last_fetch_mode: "http",
    }).eq("id", source.id);
    await admin.from("ingestion_runs").update({
      status: "succeeded",
      finished_at: finishedAt.toISOString(),
      fetched: pages.size,
      created,
      updated,
      reviewed,
    }).eq("id", runId);
    return { sourceId: source.id, source: source.name, runId, fetched: pages.size, created, updated, reviewed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Official source ingestion failed";
    const failures = source.consecutive_failures + 1;
    const backoffHours = Math.min(24, 2 ** Math.min(failures - 1, 5));
    const finishedAt = new Date();
    await admin.from("sources").update({
      last_run_at: finishedAt.toISOString(),
      next_run_at: new Date(finishedAt.getTime() + backoffHours * 60 * 60 * 1000).toISOString(),
      health: "degraded",
      consecutive_failures: failures,
      last_error: message.slice(0, 1000),
      browser_pending: source.kind === "html" && source.fetch_mode !== "http",
      last_fetch_mode: "http",
    }).eq("id", source.id);
    await admin.from("ingestion_runs").update({
      status: "failed",
      finished_at: finishedAt.toISOString(),
      error: message.slice(0, 1000),
    }).eq("id", runId);
    if (failures >= 3) {
      await admin.from("review_items").upsert({
        source_id: source.id,
        review_key: `official-source-failure:${source.id}`,
        reason: `官方来源连续 ${failures} 次抓取失败：${message.slice(0, 300)}`,
        confidence: 0.25,
        payload: { url: source.url, source: source.name, failures },
        status: "open",
      }, { onConflict: "review_key", ignoreDuplicates: true });
    }
    return { sourceId: source.id, source: source.name, runId, error: message };
  }
}

export async function runOfficialIngestionBatch(limit = SOURCE_BATCH_SIZE) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("sources")
    .select("id,name,kind,url,root_domain,canonical_url,company_domain,trust_score,config,enabled,consecutive_failures,fetch_mode,browser_pending")
    .eq("enabled", true)
    .eq("confidence", "官方")
    .gte("trust_score", 85)
    .in("kind", ["rss", "html", "sitemap"])
    .neq("fetch_mode", "browser")
    .or(`next_run_at.is.null,next_run_at.lte.${now}`)
    .order("next_run_at", { ascending: true, nullsFirst: true })
    .limit(Math.min(Math.max(limit, 1), 10));
  if (error) throw error;
  const sources = (data ?? []).filter((source) => source.root_domain) as DatabaseSource[];
  const results = [];
  for (const source of sources) results.push(await crawlSource(admin, source));

  const { count, error: countError } = await admin
    .from("sources")
    .select("id", { count: "exact", head: true })
    .eq("enabled", true)
    .eq("confidence", "官方")
    .gte("trust_score", 85)
    .in("kind", ["rss", "html", "sitemap"])
    .neq("fetch_mode", "browser")
    .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`);
  if (countError) throw countError;
  return { processed: results.length, remaining: count ?? 0, results };
}

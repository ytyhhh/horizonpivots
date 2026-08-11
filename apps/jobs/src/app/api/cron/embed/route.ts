import { timingSafeEqual } from "node:crypto";
import { jobFromEmbeddingRow, syncJobEmbeddings, syncProfileEmbedding } from "@/lib/vector-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { SILICONFLOW_EMBEDDING_MODEL } from "@/lib/embeddings";

const JOB_BATCH_SIZE = 48;
const PROFILE_BATCH_SIZE = 12;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !token) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (!process.env.SILICONFLOW_API_KEY) {
    return Response.json({ message: "SILICONFLOW_API_KEY is not configured" }, { status: 503 });
  }

  const admin = createAdminClient();
  try {
    const expectedModel = process.env.SILICONFLOW_EMBEDDING_MODEL ?? SILICONFLOW_EMBEDDING_MODEL;
    const { data: jobRows, error: jobError } = await admin.rpc("pending_job_embeddings", {
      expected_model: expectedModel,
      max_count: JOB_BATCH_SIZE,
    });
    if (jobError) throw jobError;
    const jobs = (jobRows ?? []).map((row: Record<string, unknown>) => jobFromEmbeddingRow(row));
    const jobsResult = await syncJobEmbeddings(admin, jobs);

    const { data: profiles, error: profileError } = await admin
      .from("candidate_profiles")
      .select("*")
      .is("embedding", null)
      .limit(PROFILE_BATCH_SIZE);
    if (profileError) throw profileError;
    let profilesUpdated = 0;
    for (const profile of profiles ?? []) {
      const updated = await syncProfileEmbedding(admin, String(profile.user_id), {
        userId: String(profile.user_id),
        graduationYear: profile.graduation_year,
        education: profile.education ?? "",
        major: profile.major ?? "",
        skills: profile.skills ?? [],
        experiences: profile.experiences ?? [],
        projectDomains: profile.project_domains ?? [],
        preferredLocations: profile.preferred_locations ?? [],
        preferredIndustries: profile.preferred_industries ?? [],
        preferredRoles: profile.preferred_roles ?? [],
        excludedCompanies: profile.excluded_companies ?? [],
        confirmed: profile.confirmed ?? false,
        version: profile.version ?? 1,
      });
      profilesUpdated += Number(updated);
    }
    return Response.json({ jobs: jobsResult, profilesUpdated });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Embedding rebuild failed" },
      { status: 502 },
    );
  }
}

export const POST = GET;

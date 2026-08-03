import { demoProfile } from "@/data/demo-jobs";
import { getCurrentUserId } from "@/lib/auth";
import { getJobs } from "@/lib/jobs";
import { recommendJobs } from "@/lib/recommendation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CandidateProfile } from "@/types";

type MatchJobRow = {
  job_id: string;
  similarity: number | string;
};

function serializeVector(value: unknown) {
  if (typeof value === "string" && value.startsWith("[")) return value;
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  ) {
    return `[${value.join(",")}]`;
  }
  return null;
}

async function getVectorSimilarities(admin: ReturnType<typeof createAdminClient>, embedding: unknown) {
  const vector = serializeVector(embedding);
  if (!vector) return new Map<string, number>();
  const { data, error } = await admin.rpc("match_jobs", {
    query_embedding: vector,
    match_count: 100,
  });
  if (error) {
    console.error("Vector recommendation lookup failed; using keyword fallback:", error.message);
    return new Map<string, number>();
  }
  const rows = (data ?? []) as MatchJobRow[];
  return new Map(
    rows
      .map((row) => [String(row.job_id), Number(row.similarity)] as const)
      .filter(([, similarity]) => Number.isFinite(similarity)),
  );
}

export async function GET() {
  let profile = demoProfile;
  let demo = true;

  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ message: "请先登录" }, { status: 401 });
  const admin = createAdminClient();
  const { data } = await admin
    .from("candidate_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) {
    profile = {
      userId,
      graduationYear: data.graduation_year,
      education: data.education,
      major: data.major,
      skills: data.skills ?? [],
      experiences: data.experiences ?? [],
      projectDomains: data.project_domains ?? [],
      preferredLocations: data.preferred_locations ?? [],
      preferredIndustries: data.preferred_industries ?? [],
      preferredRoles: data.preferred_roles ?? [],
      excludedCompanies: data.excluded_companies ?? [],
      confirmed: data.confirmed,
      version: data.version,
    } satisfies CandidateProfile;
    demo = false;
  }

  const jobs = await getJobs({});
  const vectorSimilarities = await getVectorSimilarities(admin, data?.embedding);
  return Response.json({
    data: recommendJobs(profile, jobs, undefined, vectorSimilarities),
    profileVersion: profile.version,
    demo,
    semanticMode: vectorSimilarities.size ? "vector" : "keyword-fallback",
  });
}

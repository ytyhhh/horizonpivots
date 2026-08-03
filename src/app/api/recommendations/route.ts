import { demoProfile } from "@/data/demo-jobs";
import { getCurrentUserId } from "@/lib/auth";
import { getJobs } from "@/lib/jobs";
import { isEligible, recommendJobs } from "@/lib/recommendation";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CandidateProfile,
  Job,
  Recommendation,
  RecommendationScores,
  RecommendationTier,
} from "@/types";

type MatchJobRow = {
  job_id: string;
  similarity: number | string;
};

type RecommendationCacheRow = {
  job_id: string;
  job_updated_at: string;
  tier: RecommendationTier;
  total_score: number | string;
  scores: unknown;
  matches: unknown;
  gaps: unknown;
  explanation: unknown;
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

function isScores(value: unknown): value is RecommendationScores {
  if (!value || typeof value !== "object") return false;
  return ["semantic", "skills", "preference", "freshness", "source"].every((key) =>
    Number.isFinite(Number((value as Record<string, unknown>)[key])),
  );
}

function toStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readRecommendationCache(
  rows: RecommendationCacheRow[],
  profile: CandidateProfile,
  jobs: Job[],
) {
  const byJobId = new Map(jobs.map((job) => [job.id, job]));
  const cached = rows.flatMap((row) => {
    const job = byJobId.get(row.job_id);
    if (
      !job ||
      !job.updatedAt ||
      job.updatedAt !== row.job_updated_at ||
      !isScores(row.scores) ||
      typeof row.explanation !== "string"
    ) {
      return [];
    }
    return [{
      job,
      tier: row.tier,
      totalScore: Number(row.total_score),
      scores: row.scores,
      matches: toStrings(row.matches),
      gaps: toStrings(row.gaps),
      explanation: row.explanation,
      profileVersion: profile.version,
    } satisfies Recommendation];
  });
  return cached.length === jobs.length
    ? cached.sort((left, right) => right.totalScore - left.totalScore)
    : null;
}

function getEligibleJobs(profile: CandidateProfile, jobs: Awaited<ReturnType<typeof getJobs>>) {
  return jobs.filter((job) => isEligible(profile, job));
}

async function writeRecommendationCache(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  recommendations: Recommendation[],
) {
  const rows = recommendations
    .filter((recommendation) => recommendation.job.updatedAt)
    .map((recommendation) => ({
      user_id: userId,
      job_id: recommendation.job.id,
      profile_version: recommendation.profileVersion,
      job_updated_at: recommendation.job.updatedAt!,
      tier: recommendation.tier,
      total_score: recommendation.totalScore,
      scores: recommendation.scores,
      matches: recommendation.matches,
      gaps: recommendation.gaps,
      explanation: recommendation.explanation,
    }));
  if (!rows.length) return;

  const { error: clearError } = await admin
    .from("recommendation_cache")
    .delete()
    .eq("user_id", userId)
    .eq("profile_version", recommendations[0]?.profileVersion ?? 0);
  if (clearError) throw clearError;

  for (let index = 0; index < rows.length; index += 100) {
    const { error } = await admin
      .from("recommendation_cache")
      .upsert(rows.slice(index, index + 100), {
        onConflict: "user_id,job_id,profile_version",
      });
    if (error) throw error;
  }
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
  const eligibleJobs = getEligibleJobs(profile, jobs);
  if (!demo) {
    const { data: cacheRows, error: cacheError } = await admin
      .from("recommendation_cache")
      .select("job_id,job_updated_at,tier,total_score,scores,matches,gaps,explanation")
      .eq("user_id", userId)
      .eq("profile_version", profile.version);
    if (!cacheError) {
      const cached = readRecommendationCache(
        (cacheRows ?? []) as RecommendationCacheRow[],
        profile,
        eligibleJobs,
      );
      if (cached) {
        return Response.json({
          data: cached,
          profileVersion: profile.version,
          demo,
          semanticMode: "cache",
        });
      }
    }
  }
  const vectorSimilarities = await getVectorSimilarities(admin, data?.embedding);
  const recommendations = recommendJobs(profile, jobs, undefined, vectorSimilarities);
  if (!demo) {
    try {
      await writeRecommendationCache(admin, userId, recommendations);
    } catch (cacheError) {
      console.error("Recommendation cache write failed; returning live recommendations:", cacheError);
    }
  }
  return Response.json({
    data: recommendations,
    profileVersion: profile.version,
    demo,
    semanticMode: vectorSimilarities.size ? "vector" : "keyword-fallback",
  });
}

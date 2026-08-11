import { INSTITUTIONS } from "@/data/institutions";
import { discoverFaculty } from "@/lib/openalex";
import { rerank } from "@/lib/scoring";
import { enhanceRanking } from "@/lib/siliconflow";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FacultyRecommendation, SchoolProgress, SearchJob, SearchQuery } from "@/lib/types";

type JobRow = {
  id: string;
  status: SearchJob["status"];
  stage: SearchJob["stage"];
  progress: number;
  query: SearchQuery;
  school_progress: SchoolProgress[];
  created_at: string;
  completed_at: string | null;
  error: string | null;
};

function asSearchJob(row: JobRow, results: FacultyRecommendation[]): SearchJob {
  return {
    id: row.id,
    status: row.status,
    stage: row.stage,
    progress: row.progress,
    query: row.query,
    schools: row.school_progress,
    results,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    error: row.error ?? undefined,
  };
}

export function initialSchoolProgress(query: SearchQuery): SchoolProgress[] {
  return query.selectedInstitutionIds.flatMap((institutionId) => {
    const institution = INSTITUTIONS.find((item) => item.id === institutionId);
    return institution ? [{ institutionId, institutionName: institution.name, status: "queued" as const, discovered: 0, verified: 0, highMatch: 0 }] : [];
  });
}

export async function getPersistentSearchJob(id: string, client: NonNullable<Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>>) {
  const { data: row, error } = await client.from("phd_search_jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const { data: recommendations, error: recommendationError } = await client
    .from("phd_faculty_recommendations")
    .select("payload")
    .eq("search_job_id", id)
    .order("rank", { ascending: true });
  if (recommendationError) throw recommendationError;
  return asSearchJob(row as JobRow, (recommendations ?? []).map((item) => item.payload as FacultyRecommendation));
}

async function updateJob(id: string, patch: Record<string, unknown>) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase service role is not configured");
  const { error } = await admin.from("phd_search_jobs").update(patch).eq("id", id);
  if (error) throw error;
}

export async function markPersistentSearchFailed(jobId: string, message: string) {
  await updateJob(jobId, {
    status: "failed",
    stage: "complete",
    progress: 100,
    error: message.slice(0, 500),
    completed_at: new Date().toISOString(),
  });
}

export async function runPersistentSearch(jobId: string) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase service role is not configured");
  const { data: row, error } = await admin.from("phd_search_jobs").select("*").eq("id", jobId).single();
  if (error) throw error;
  const query = row.query as SearchQuery;
  const schools = (row.school_progress as SchoolProgress[]).map((school) => ({ ...school }));
  await updateJob(jobId, { status: "running", stage: "discovering", progress: 6, school_progress: schools });

  const recommendations: FacultyRecommendation[] = [];
  let failures = 0;
  for (let index = 0; index < schools.length; index += 1) {
    const school = schools[index];
    school.status = "discovering";
    await updateJob(jobId, { stage: "discovering", progress: Math.max(6, Math.round((index / schools.length) * 76) + 6), school_progress: schools });
    try {
      const found = await discoverFaculty(school.institutionId, query, (stage, discovered, verified) => {
        school.status = stage;
        school.discovered = discovered;
        school.verified = verified;
      });
      school.status = "complete";
      school.discovered = found.length;
      school.verified = found.filter((item) => item.verification === "official").length;
      school.highMatch = found.filter((item) => item.matchScore >= 75).length;
      recommendations.push(...found);
    } catch (error) {
      failures += 1;
      school.status = "failed";
      school.error = error instanceof Error ? error.message : "Unknown error";
    }
    await updateJob(jobId, { progress: Math.max(8, Math.round(((index + 1) / schools.length) * 82) + 6), school_progress: schools });
  }

  try {
    await updateJob(jobId, { stage: "ranking", progress: 92, school_progress: schools });
    const ranked = rerank(await enhanceRanking(recommendations, query));
    await admin.from("phd_faculty_recommendations").delete().eq("search_job_id", jobId);
    if (ranked.length) {
      const { error: insertError } = await admin.from("phd_faculty_recommendations").insert(
        ranked.map((recommendation, rank) => ({
          id: recommendation.id,
          search_job_id: jobId,
          user_id: row.user_id,
          institution_id: recommendation.institutionId,
          author_id: recommendation.authorId,
          payload: recommendation,
          rank: rank + 1,
        })),
      );
      if (insertError) throw insertError;
    }
    const status: SearchJob["status"] = failures === schools.length ? "failed" : failures > 0 ? "partial" : "complete";
    await updateJob(jobId, {
      status,
      stage: "complete",
      progress: 100,
      school_progress: schools,
      error: status === "failed" ? "All school searches failed. Please try again later." : null,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    await updateJob(jobId, {
      status: "failed",
      stage: "complete",
      progress: 100,
      school_progress: schools,
      error: error instanceof Error ? error.message : "Search failed",
      completed_at: new Date().toISOString(),
    });
  }
}

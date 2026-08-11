import { NextResponse } from "next/server";
import { searchQuerySchema } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";
import { dispatchPhdSearch } from "@/lib/github-dispatch";
import { initialSchoolProgress, runPersistentSearch } from "@/lib/persistent-search";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_PHD_SEARCH_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Faculty search is coming soon" },
      { status: 503 },
    );
  }

  try {
    const input = searchQuerySchema.parse(await request.json());
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: "Search storage is not configured" }, { status: 503 });
    const { data: job, error } = await supabase.from("phd_search_jobs").insert({
      user_id: userId,
      query: input,
      school_progress: initialSchoolProgress(input),
    }).select("id, status, stage, progress, query, school_progress, created_at, completed_at, error").single();
    if (error) throw error;

    if (process.env.GITHUB_DISPATCH_TOKEN) {
      await dispatchPhdSearch(job.id);
    } else if (process.env.NODE_ENV !== "production") {
      void runPersistentSearch(job.id);
    } else {
      const failedJob = {
        ...job,
        status: "failed" as const,
        stage: "complete" as const,
        progress: 100,
        error: "GitHub search worker is not configured",
      };
      await supabase.from("phd_search_jobs").update({
        status: failedJob.status,
        stage: failedJob.stage,
        progress: failedJob.progress,
        error: failedJob.error,
        completed_at: new Date().toISOString(),
      }).eq("id", job.id);
      return NextResponse.json(
        { data: { ...failedJob, schools: job.school_progress, results: [] } },
        { status: 503 },
      );
    }
    return NextResponse.json({ data: { ...job, schools: job.school_progress, results: [] } }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid search request", details: error instanceof Error ? error.message : undefined },
      { status: 400 },
    );
  }
}

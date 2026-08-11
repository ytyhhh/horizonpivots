import { NextResponse } from "next/server";
import { searchQuerySchema } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";
import { initialSchoolProgress, runPersistentSearch } from "@/lib/persistent-search";
import { createClient } from "@/lib/supabase/server";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(request: Request) {
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

    if (process.env.TRIGGER_SECRET_KEY) {
      const run = await tasks.trigger("institution-scoped-search", { jobId: job.id, userId, query: input });
      await supabase.from("phd_search_jobs").update({ trigger_run_id: run.id }).eq("id", job.id);
    } else if (process.env.NODE_ENV !== "production") {
      void runPersistentSearch(job.id);
    } else {
      await supabase.from("phd_search_jobs").update({ status: "failed", stage: "complete", progress: 100, error: "Search worker is not configured" }).eq("id", job.id);
    }
    return NextResponse.json({ data: { ...job, schools: job.school_progress, results: [] } }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid search request", details: error instanceof Error ? error.message : undefined },
      { status: 400 },
    );
  }
}

import { getJob } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";

async function contextFor(jobId: string) {
  const supabase = await createClient();
  if (!supabase) return { demo: true as const, supabase: null, user: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { demo: false as const, supabase, user: null };
  const job = await getJob(jobId);
  return { demo: false as const, supabase, user, job };
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const state = await contextFor(jobId);
  if (state.demo) return Response.json({ saved: true, demo: true });
  if (!state.user) return Response.json({ message: "请先登录" }, { status: 401 });
  if (!state.job) return Response.json({ message: "岗位不存在" }, { status: 404 });
  const { error } = await state.supabase.from("saved_jobs").upsert(
    { user_id: state.user.id, job_id: jobId },
    { onConflict: "user_id,job_id" },
  );
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ saved: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const state = await contextFor(jobId);
  if (state.demo) return Response.json({ saved: false, demo: true });
  if (!state.user) return Response.json({ message: "请先登录" }, { status: 401 });
  const { error } = await state.supabase
    .from("saved_jobs")
    .delete()
    .eq("user_id", state.user.id)
    .eq("job_id", jobId);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ saved: false });
}

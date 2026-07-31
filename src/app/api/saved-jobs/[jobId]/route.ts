import { getJob } from "@/lib/jobs";
import { getCurrentUserId } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function contextFor(jobId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { userId: null, job: null };
  const job = await getJob(jobId);
  return { userId, job };
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const state = await contextFor(jobId);
  if (!state.userId) return Response.json({ message: "请先登录" }, { status: 401 });
  if (!state.job) return Response.json({ message: "岗位不存在" }, { status: 404 });
  const { error } = await createAdminClient().from("saved_jobs").upsert(
    { user_id: state.userId, job_id: jobId },
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
  if (!state.userId) return Response.json({ message: "请先登录" }, { status: 401 });
  const { error } = await createAdminClient()
    .from("saved_jobs")
    .delete()
    .eq("user_id", state.userId)
    .eq("job_id", jobId);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ saved: false });
}

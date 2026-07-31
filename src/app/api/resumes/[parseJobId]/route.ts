import { getCurrentUserId } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ parseJobId: string }> },
) {
  const { parseJobId } = await context.params;
  if (parseJobId.startsWith("demo_")) {
    return Response.json({ data: { id: parseJobId, status: "succeeded" } });
  }
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ message: "请先登录" }, { status: 401 });
  const { data, error } = await createAdminClient()
    .from("resume_parse_jobs")
    .select("id,status,error,created_at,finished_at")
    .eq("id", parseJobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return Response.json({ message: "任务不存在" }, { status: 404 });
  return Response.json({ data });
}

import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ parseJobId: string }> },
) {
  const { parseJobId } = await context.params;
  if (parseJobId.startsWith("demo_")) {
    return Response.json({ data: { id: parseJobId, status: "succeeded" } });
  }
  const supabase = await createClient();
  if (!supabase) return Response.json({ message: "未配置" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ message: "请先登录" }, { status: 401 });
  const { data, error } = await supabase
    .from("resume_parse_jobs")
    .select("id,status,error,created_at,finished_at")
    .eq("id", parseJobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return Response.json({ message: "任务不存在" }, { status: 404 });
  return Response.json({ data });
}

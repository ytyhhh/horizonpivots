import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const actions = new Set(["pause", "resume", "retry"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return Response.json({ message: "Forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (!body?.action || !actions.has(body.action)) {
    return Response.json({ message: "Invalid source action" }, { status: 400 });
  }
  const { id } = await context.params;
  const values = body.action === "pause"
    ? { enabled: false, health: "paused" }
    : body.action === "resume"
      ? { enabled: true, health: "healthy", next_run_at: new Date().toISOString(), last_error: null }
      : { enabled: true, next_run_at: new Date().toISOString() };
  const { data, error } = await createAdminClient()
    .from("sources")
    .update(values)
    .eq("id", id)
    .select("id,name,enabled,health,next_run_at")
    .maybeSingle();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  if (!data) return Response.json({ message: "Source not found" }, { status: 404 });
  return Response.json({ data });
}


import { timingSafeEqual } from "node:crypto";
import { discoverOfficialRecruitingPages } from "@/lib/ingestion/discovery";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !header) return false;
  const left = Buffer.from(secret);
  const right = Buffer.from(header);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    const candidates = await discoverOfficialRecruitingPages();
    const { data: source } = await admin
      .from("sources")
      .select("id")
      .eq("name", "公开网页发现")
      .single();

    const rows = candidates.map((candidate) => ({
      source_id: source?.id,
      reason: candidate.reason,
      confidence: 0.65,
      payload: candidate,
      status: "open",
    }));
    if (rows.length) {
      const { error } = await admin.from("review_items").insert(rows);
      if (error) throw error;
    }
    await admin
      .from("sources")
      .update({
        last_run_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        health: "healthy",
      })
      .eq("name", "公开网页发现");
    return Response.json({ discovered: candidates.length, queued: rows.length });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Discovery failed" },
      { status: 502 },
    );
  }
}

export const POST = GET;

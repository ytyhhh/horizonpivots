import { randomUUID, timingSafeEqual } from "node:crypto";
import { parseCuhkShenzhenJobs } from "@/lib/ingestion/cuhk-shenzhen";
import { dedupeJobsByFingerprint, toJobRow } from "@/lib/ingestion/xixicc";
import { createAdminClient } from "@/lib/supabase/admin";

const UPSERT_BATCH_SIZE = 50;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !token) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const runId = randomUUID();
  const { data: source } = await admin
    .from("sources")
    .select("id")
    .eq("name", "港中深就业中心")
    .maybeSingle();
  await admin.from("ingestion_runs").insert({
    id: runId,
    source_id: source?.id,
    status: "running",
  });

  try {
    const jobs = dedupeJobsByFingerprint(parseCuhkShenzhenJobs(await request.json()));
    const rows = jobs.map(toJobRow);
    let updated = 0;
    for (let index = 0; index < rows.length; index += UPSERT_BATCH_SIZE) {
      const { data, error } = await admin
        .from("jobs")
        .upsert(rows.slice(index, index + UPSERT_BATCH_SIZE), { onConflict: "fingerprint" })
        .select("id");
      if (error) throw error;
      updated += data?.length ?? 0;
    }
    await admin
      .from("sources")
      .update({
        last_run_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        health: "healthy",
      })
      .eq("name", "港中深就业中心");
    await admin
      .from("ingestion_runs")
      .update({ status: "succeeded", finished_at: new Date().toISOString(), fetched: jobs.length, updated })
      .eq("id", runId);
    return Response.json({
      runId,
      fetched: jobs.length,
      updated,
      embeddings: "pending",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed";
    console.error("CUHK-Shenzhen ingestion failed:", error);
    await admin
      .from("sources")
      .update({ last_run_at: new Date().toISOString(), health: "degraded" })
      .eq("name", "港中深就业中心");
    await admin
      .from("ingestion_runs")
      .update({ status: "failed", finished_at: new Date().toISOString(), error: message.slice(0, 1000) })
      .eq("id", runId);
    return Response.json(
      { message: "Ingestion failed", error: message.slice(0, 500), runId },
      { status: 500 },
    );
  }
}

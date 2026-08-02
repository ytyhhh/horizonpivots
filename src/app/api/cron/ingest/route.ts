import { randomUUID, timingSafeEqual } from "node:crypto";
import {
  dedupeJobsByFingerprint,
  fetchXixiccJobs,
  toJobRow,
} from "@/lib/ingestion/xixicc";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncJobEmbeddings } from "@/lib/vector-sync";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !header) return false;
  const left = Buffer.from(secret);
  const right = Buffer.from(header);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function runIngestion() {
  const admin = createAdminClient();
  const runId = randomUUID();
  const { data: source } = await admin
    .from("sources")
    .select("id")
    .eq("name", "xixicc2027")
    .single();
  await admin.from("ingestion_runs").insert({
    id: runId,
    source_id: source?.id,
    status: "running",
  });

  try {
    const jobs = await fetchXixiccJobs();
    const rows = dedupeJobsByFingerprint(jobs).map(toJobRow);
    let updated = 0;
    for (let index = 0; index < rows.length; index += 100) {
      const { data, error } = await admin
        .from("jobs")
        .upsert(rows.slice(index, index + 100), { onConflict: "fingerprint" })
        .select("id");
      if (error) throw error;
      updated += data?.length ?? 0;
    }
    try {
      await syncJobEmbeddings(admin, jobs);
    } catch (embeddingError) {
      console.error("Job embedding sync failed; jobs remain available:", embeddingError);
    }
    await admin
      .from("sources")
      .update({
        last_run_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        health: "healthy",
      })
      .eq("name", "xixicc2027");
    await admin
      .from("ingestion_runs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
        fetched: jobs.length,
        updated,
      })
      .eq("id", runId);
    return { runId, fetched: jobs.length, updated };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String(error.message)
          : "unknown";
    await admin
      .from("sources")
      .update({ last_run_at: new Date().toISOString(), health: "degraded" })
      .eq("name", "xixicc2027");
    await admin
      .from("ingestion_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error: message.slice(0, 1000),
      })
      .eq("id", runId);
    throw error;
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await runIngestion());
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 502 },
    );
  }
}

export const POST = GET;

import { createHash, randomUUID } from "node:crypto";
import { isCronAuthorized } from "@/lib/cron-auth";
import { discoverOfficialRecruitingPages } from "@/lib/ingestion/discovery";
import { createAdminClient } from "@/lib/supabase/admin";

function reviewKey(rootDomain: string) {
  return `official-source:${createHash("sha256").update(rootDomain).digest("hex").slice(0, 32)}`;
}

export async function runOfficialDiscovery() {
  const admin = createAdminClient();
  const runId = randomUUID();
  const { data: discoverySource } = await admin
    .from("sources")
    .select("id")
    .eq("name", "公开网页发现")
    .single();
  await admin.from("ingestion_runs").insert({
    id: runId,
    source_id: discoverySource?.id,
    status: "running",
  });

  try {
    const candidates = await discoverOfficialRecruitingPages();
    let trusted = 0;
    let reviewed = 0;
    for (const candidate of candidates) {
      if (candidate.trusted) {
        const { data: existing } = await admin
          .from("sources")
          .select("id")
          .eq("root_domain", candidate.rootDomain)
          .maybeSingle();
        if (existing) {
          const { error } = await admin
            .from("sources")
            .update({
              trust_score: candidate.trustScore,
              trust_signals: candidate.trustSignals,
              last_error: null,
            })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await admin.from("sources").insert({
            name: `${candidate.company} 官方招聘 (${candidate.rootDomain})`,
            kind: candidate.kind,
            url: candidate.url,
            confidence: "官方",
            root_domain: candidate.rootDomain,
            trust_score: candidate.trustScore,
            trust_signals: candidate.trustSignals,
            discovered_by: "tavily",
            next_run_at: new Date().toISOString(),
            config: { company: candidate.company },
          });
          if (error) throw error;
        }
        trusted += 1;
      } else {
        const { error } = await admin.from("review_items").upsert(
          {
            source_id: discoverySource?.id,
            review_key: reviewKey(candidate.rootDomain),
            reason: candidate.reason,
            confidence: candidate.trustScore / 100,
            payload: candidate,
            status: "open",
          },
          { onConflict: "review_key", ignoreDuplicates: true },
        );
        if (error) throw error;
        reviewed += 1;
      }
    }

    const finishedAt = new Date().toISOString();
    await admin
      .from("sources")
      .update({ last_run_at: finishedAt, last_success_at: finishedAt, health: "healthy", last_error: null })
      .eq("name", "公开网页发现");
    await admin
      .from("ingestion_runs")
      .update({
        status: "succeeded",
        finished_at: finishedAt,
        fetched: candidates.length,
        created: trusted,
        reviewed,
      })
      .eq("id", runId);
    return { runId, discovered: candidates.length, trusted, reviewed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed";
    const finishedAt = new Date().toISOString();
    await admin
      .from("sources")
      .update({ last_run_at: finishedAt, health: "degraded", last_error: message.slice(0, 1000) })
      .eq("name", "公开网页发现");
    await admin
      .from("ingestion_runs")
      .update({ status: "failed", finished_at: finishedAt, error: message.slice(0, 1000) })
      .eq("id", runId);
    throw error;
  }
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return Response.json({ message: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await runOfficialDiscovery());
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Discovery failed" },
      { status: 502 },
    );
  }
}

export const POST = GET;


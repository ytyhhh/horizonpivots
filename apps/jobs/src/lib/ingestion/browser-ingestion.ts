import { randomUUID } from "node:crypto";
import {
  extractOfficialJobsFromPage,
  officialExtractionToJob,
  type OfficialSourceRecord,
} from "@/lib/ingestion/official-extraction";
import { markMissingJobs, sourceContentHash } from "@/lib/ingestion/official-runner";
import { rootDomain } from "@/lib/ingestion/trust";
import { toJobRow } from "@/lib/ingestion/xixicc";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_JOBS_PER_SOURCE = 500;

interface BrowserSource extends OfficialSourceRecord {
  enabled: boolean;
  confidence: string;
  consecutive_failures: number;
  fetch_mode: "auto" | "http" | "browser";
}

export interface BrowserFetchedPage {
  url: string;
  html: string;
}

function approvedDomains(source: BrowserSource) {
  const configured = Array.isArray(source.config.approvedDomains)
    ? source.config.approvedDomains.map((value) => rootDomain(String(value).toLocaleLowerCase()))
    : [];
  return new Set([source.root_domain, source.company_domain ?? "", ...configured].filter(Boolean));
}

export function browserPageBelongsToSource(pageUrl: string, source: BrowserSource) {
  try {
    const parsed = new URL(pageUrl);
    return parsed.protocol === "https:" && approvedDomains(source).has(rootDomain(parsed.hostname));
  } catch {
    return false;
  }
}

async function recordFailure(
  admin: ReturnType<typeof createAdminClient>,
  source: BrowserSource,
  runId: string,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : "Browser ingestion failed";
  const failures = source.consecutive_failures + 1;
  const backoffHours = Math.min(24, 2 ** Math.min(failures - 1, 5));
  const finishedAt = new Date();
  await admin.from("sources").update({
    last_run_at: finishedAt.toISOString(),
    next_run_at: new Date(finishedAt.getTime() + backoffHours * 60 * 60 * 1000).toISOString(),
    health: "degraded",
    consecutive_failures: failures,
    last_error: message.slice(0, 1000),
    browser_pending: true,
    last_fetch_mode: "browser",
  }).eq("id", source.id);
  await admin.from("ingestion_runs").update({
    status: "failed",
    finished_at: finishedAt.toISOString(),
    error: message.slice(0, 1000),
  }).eq("id", runId);
  if (failures >= 3) {
    await admin.from("review_items").upsert({
      source_id: source.id,
      review_key: `official-browser-failure:${source.id}`,
      reason: `Scrapling 连续 ${failures} 次未能完成官网采集：${message.slice(0, 300)}`,
      confidence: 0.25,
      payload: { url: source.url, source: source.name, failures },
      status: "open",
    }, { onConflict: "review_key", ignoreDuplicates: true });
  }
  return { sourceId: source.id, source: source.name, runId, error: message };
}

export async function recordOfficialBrowserFailure(sourceId: string, message: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sources")
    .select("id,name,url,root_domain,canonical_url,company_domain,trust_score,config,enabled,confidence,consecutive_failures,fetch_mode")
    .eq("id", sourceId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.enabled || data.confidence !== "官方") {
    throw new Error("Browser source is missing or disabled");
  }
  const source = data as BrowserSource;
  const runId = randomUUID();
  await admin.from("ingestion_runs").insert({ id: runId, source_id: source.id, status: "running" });
  return recordFailure(admin, source, runId, new Error(message.slice(0, 1000)));
}

export async function ingestOfficialBrowserPages(input: {
  sourceId: string;
  pages: BrowserFetchedPage[];
  complete: boolean;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sources")
    .select("id,name,url,root_domain,canonical_url,company_domain,trust_score,config,enabled,confidence,consecutive_failures,fetch_mode")
    .eq("id", input.sourceId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.enabled || data.confidence !== "官方" || Number(data.trust_score) < 85) {
    throw new Error("Browser source is missing, disabled, or not trusted");
  }
  const source = data as BrowserSource;
  if (input.pages.some((page) => !browserPageBelongsToSource(page.url, source))) {
    throw new Error("Browser payload contains a page outside the approved source domains");
  }

  const runId = randomUUID();
  await admin.from("ingestion_runs").insert({ id: runId, source_id: source.id, status: "running" });
  try {
    const extracted = [] as ReturnType<typeof officialExtractionToJob>[];
    let reviewed = 0;
    for (const page of input.pages) {
      const items = await extractOfficialJobsFromPage(page.html, page.url, source);
      if (!items.length) {
        reviewed += 1;
        await admin.from("review_items").upsert({
          source_id: source.id,
          review_key: `official-browser-page:${Buffer.from(page.url).toString("base64url").slice(0, 80)}`,
          reason: "浏览器渲染后的官方页面仍未产生通过证据校验的岗位",
          confidence: 0.5,
          payload: { url: page.url, source: source.name },
          status: "open",
        }, { onConflict: "review_key", ignoreDuplicates: true });
      }
      items.forEach((item) => extracted.push(officialExtractionToJob(item, page.url, source)));
    }
    const jobs = [...new Map(extracted.map((job) => [job.fingerprint, job])).values()]
      .slice(0, MAX_JOBS_PER_SOURCE);
    if (!jobs.length) throw new Error("Browser pages produced no verified jobs");

    const existing = new Map<string, { id: string; firstSeen: string; contentHash: string | null }>();
    for (let index = 0; index < jobs.length; index += 100) {
      const fingerprints = jobs.slice(index, index + 100).map((job) => job.fingerprint);
      const { data: rows, error: rowsError } = await admin
        .from("jobs")
        .select("id,fingerprint,first_seen,source_content_hash")
        .in("fingerprint", fingerprints);
      if (rowsError) throw rowsError;
      (rows ?? []).forEach((row) => existing.set(String(row.fingerprint), {
        id: String(row.id),
        firstSeen: String(row.first_seen),
        contentHash: row.source_content_hash ? String(row.source_content_hash) : null,
      }));
    }

    const seenIds = new Set<string>();
    const unchangedIds: string[] = [];
    const changedJobs = jobs.filter((job) => {
      const row = existing.get(job.fingerprint);
      if (row?.contentHash === sourceContentHash(job)) {
        unchangedIds.push(row.id);
        seenIds.add(row.id);
        return false;
      }
      return true;
    });
    for (let index = 0; index < unchangedIds.length; index += 100) {
      const { error: updateError } = await admin.from("jobs").update({
        last_seen: new Date().toISOString().slice(0, 10),
        last_seen_run_id: runId,
        missing_count: 0,
      }).in("id", unchangedIds.slice(index, index + 100));
      if (updateError) throw updateError;
    }
    const contentUpdatedAt = new Date().toISOString();
    for (let index = 0; index < changedJobs.length; index += 100) {
      const rows = changedJobs.slice(index, index + 100).map((job) => ({
        ...toJobRow({ ...job, firstSeen: existing.get(job.fingerprint)?.firstSeen ?? job.firstSeen }),
        source_id: source.id,
        source_item_key: job.sourceItemKey,
        extraction_method: job.extractionMethod,
        evidence: job.evidence,
        last_seen_run_id: runId,
        missing_count: 0,
        source_content_hash: sourceContentHash(job),
        content_updated_at: contentUpdatedAt,
        embedding: null,
        embedding_source_hash: null,
        embedding_model: null,
        embedded_at: null,
      }));
      const { data: saved, error: saveError } = await admin
        .from("jobs")
        .upsert(rows, { onConflict: "fingerprint" })
        .select("id");
      if (saveError) throw saveError;
      (saved ?? []).forEach((row) => seenIds.add(String(row.id)));
    }
    if (input.complete) await markMissingJobs(admin, source.id, seenIds);

    const created = jobs.filter((job) => !existing.has(job.fingerprint)).length;
    const updated = changedJobs.length - created;
    const finishedAt = new Date();
    await admin.from("sources").update({
      last_run_at: finishedAt.toISOString(),
      last_success_at: finishedAt.toISOString(),
      next_run_at: new Date(finishedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      health: "healthy",
      consecutive_failures: 0,
      last_error: null,
      browser_pending: false,
      last_fetch_mode: "browser",
    }).eq("id", source.id);
    await admin.from("ingestion_runs").update({
      status: "succeeded",
      finished_at: finishedAt.toISOString(),
      fetched: input.pages.length,
      created,
      updated,
      reviewed,
    }).eq("id", runId);
    return { sourceId: source.id, source: source.name, runId, fetched: input.pages.length, created, updated, reviewed };
  } catch (error) {
    return recordFailure(admin, source, runId, error);
  }
}

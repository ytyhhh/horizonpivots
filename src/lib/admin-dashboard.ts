import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminSourceRow {
  id: string;
  name: string;
  kind: string;
  url: string;
  enabled: boolean;
  confidence: string;
  health: string;
  root_domain: string | null;
  canonical_url: string | null;
  company_domain: string | null;
  fetch_mode: "auto" | "http" | "browser";
  browser_pending: boolean;
  last_fetch_mode: "http" | "browser" | null;
  trust_score: number;
  trust_signals: unknown;
  next_run_at: string | null;
  consecutive_failures: number;
  last_error: string | null;
  last_run_at: string | null;
  last_success_at: string | null;
}

export interface AdminRunRow {
  id: string;
  source_id: string | null;
  status: string;
  fetched: number;
  created: number;
  updated: number;
  reviewed: number;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface AdminReviewRow {
  id: string;
  source_id: string | null;
  reason: string;
  confidence: number | null;
  payload: unknown;
  status: string;
  created_at: string;
}

export interface AdminDigestRow {
  digest_date: string;
  status: string;
  resend_email_id: string | null;
  error: string | null;
  sent_at: string | null;
}

export interface AdminDashboardData {
  sources: AdminSourceRow[];
  runs: AdminRunRow[];
  reviews: AdminReviewRow[];
  digests: AdminDigestRow[];
  metrics: {
    jobs: number;
    healthySources: number;
    totalSources: number;
    openReviews: number;
    failedSources: number;
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const admin = createAdminClient();
  const [sources, runs, reviews, jobs, digest] = await Promise.all([
    admin
      .from("sources")
      .select("id,name,kind,url,enabled,confidence,health,root_domain,canonical_url,company_domain,fetch_mode,browser_pending,last_fetch_mode,trust_score,trust_signals,next_run_at,consecutive_failures,last_error,last_run_at,last_success_at")
      .order("name"),
    admin
      .from("ingestion_runs")
      .select("id,source_id,status,fetched,created,updated,reviewed,error,started_at,finished_at")
      .order("started_at", { ascending: false })
      .limit(30),
    admin
      .from("review_items")
      .select("id,source_id,reason,confidence,payload,status,created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("jobs").select("id", { count: "exact", head: true }).in("status", ["active", "stale"]),
    admin
      .from("daily_digest_runs")
      .select("digest_date,status,resend_email_id,error,sent_at")
      .order("digest_date", { ascending: false })
      .limit(7),
  ]);
  const error = [sources.error, runs.error, reviews.error, jobs.error, digest.error].find(Boolean);
  if (error) throw error;
  const sourceRows = (sources.data ?? []) as AdminSourceRow[];
  return {
    sources: sourceRows,
    runs: (runs.data ?? []) as AdminRunRow[],
    reviews: (reviews.data ?? []) as AdminReviewRow[],
    digests: (digest.data ?? []) as AdminDigestRow[],
    metrics: {
      jobs: jobs.count ?? 0,
      healthySources: sourceRows.filter((source) => source.health === "healthy" && source.enabled).length,
      totalSources: sourceRows.length,
      openReviews: reviews.data?.length ?? 0,
      failedSources: sourceRows.filter((source) => source.health === "degraded").length,
    },
  };
}

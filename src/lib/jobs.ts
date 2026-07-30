import { demoJobs } from "@/data/demo-jobs";
import { jobQuerySchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { daysUntil, isConfigured, isExpired, toJobSearchText } from "@/lib/utils";
import type { Job } from "@/types";

export interface JobQuery {
  query?: string;
  type?: string;
  industry?: string;
  location?: string;
  cohort?: string;
  deadlineWithin?: string | number;
  confidence?: string;
  cursor?: string;
  limit?: string | number;
}

export function filterJobs(jobs: Job[], input: JobQuery, now = new Date()) {
  const parsed = jobQuerySchema.parse(input);
  const normalized = parsed.query.toLocaleLowerCase();
  const filtered = jobs.filter((job) => {
    if (job.status === "archived" || isExpired(job.deadline, now)) return false;
    if (normalized && !toJobSearchText(job).includes(normalized)) return false;
    if (parsed.type && job.type !== parsed.type) return false;
    if (parsed.industry && job.industry !== parsed.industry) return false;
    if (parsed.location && !job.locations.includes(parsed.location)) return false;
    if (parsed.cohort && job.cohort !== parsed.cohort) return false;
    if (parsed.confidence && job.sourceConfidence !== parsed.confidence) return false;
    if (parsed.deadlineWithin) {
      const days = daysUntil(job.deadline, now);
      if (days === null || days < 0 || days > parsed.deadlineWithin) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    const freshness = b.firstSeen.localeCompare(a.firstSeen);
    if (freshness !== 0) return freshness;
    return a.company.localeCompare(b.company, "zh-CN");
  });
}

function mapDatabaseJob(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    company: String(row.company),
    title: String(row.title),
    program: (row.program as string | null) ?? null,
    type: row.job_type as Job["type"],
    batch: String(row.batch),
    industry: row.industry as Job["industry"],
    locations: (row.locations as string[]) ?? [],
    cohort: String(row.cohort),
    skills: (row.skills as string[]) ?? [],
    summary: String(row.summary ?? ""),
    deadline: (row.deadline as string | null) ?? null,
    applyUrl: (row.apply_url as string | null) ?? null,
    sourceUrl: String(row.source_url),
    sourceName: String(row.source_name),
    sourceConfidence: row.source_confidence as Job["sourceConfidence"],
    firstSeen: String(row.first_seen),
    lastSeen: String(row.last_seen),
    status: row.status as Job["status"],
    fingerprint: String(row.fingerprint),
  };
}

export async function getJobs(input: JobQuery = {}): Promise<Job[]> {
  if (!isConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return filterJobs(demoJobs, input, new Date("2026-07-30T12:00:00+08:00"));
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jobs")
    .select("*")
    .neq("status", "archived")
    .order("first_seen", { ascending: false })
    .limit(500);

  if (error || !data) {
    console.error("Falling back to demo jobs:", error?.message);
    return filterJobs(demoJobs, input);
  }
  return filterJobs(data.map(mapDatabaseJob), input);
}

export async function getJob(id: string) {
  const jobs = await getJobs({});
  return jobs.find((job) => job.id === id) ?? null;
}

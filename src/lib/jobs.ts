import { demoJobs } from "@/data/demo-jobs";
import { canViewCuhkShenzhenJobs } from "@/lib/auth";
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

export interface JobPage {
  data: Job[];
  nextCursor: string | null;
  total: number;
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

export function filterJobsByAudience(jobs: Job[], canViewCuhkShenzhenOnly: boolean) {
  return jobs.filter((job) => !job.cuhkShenzhenOnly || canViewCuhkShenzhenOnly);
}

function withCuhkShenzhenJobs(jobs: Job[], canViewCuhkShenzhenOnly: boolean) {
  return filterJobsByAudience(jobs, canViewCuhkShenzhenOnly);
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
    description: String(row.description ?? ""),
    deadline: (row.deadline as string | null) ?? null,
    applyUrl: (row.apply_url as string | null) ?? null,
    sourceUrl: String(row.source_url),
    sourceName: String(row.source_name),
    sourceConfidence: row.source_confidence as Job["sourceConfidence"],
    firstSeen: String(row.first_seen),
    lastSeen: String(row.last_seen),
    status: row.status as Job["status"],
    fingerprint: String(row.fingerprint),
    cuhkShenzhenOnly: Boolean(row.cuhk_shenzhen_only),
  };
}

function encodeCursor(job: Job) {
  return Buffer.from(JSON.stringify([job.firstSeen, job.id])).toString("base64url");
}

function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  try {
    const [firstSeen, id] = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    return typeof firstSeen === "string" && typeof id === "string" ? { firstSeen, id } : null;
  } catch {
    return null;
  }
}

function safeSearchTerm(value: string) {
  return value.replace(/[,.()%]/g, " ").trim();
}

export async function getJobsPage(input: JobQuery = {}): Promise<JobPage> {
  const parsed = jobQuerySchema.parse(input);
  const limit = parsed.limit;
  const canViewCuhkShenzhenOnly = await canViewCuhkShenzhenJobs();

  if (!isConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const jobs = filterJobs(withCuhkShenzhenJobs(demoJobs, canViewCuhkShenzhenOnly), parsed);
    const start = parsed.cursor
      ? Math.max(0, jobs.findIndex((job) => job.id === parsed.cursor) + 1)
      : 0;
    const data = jobs.slice(start, start + limit);
    return {
      data,
      nextCursor: start + limit < jobs.length ? data.at(-1)?.id ?? null : null,
      total: jobs.length,
    };
  }

  const admin = createAdminClient();
  let request = admin
    .from("jobs")
    .select("*", { count: "exact" })
    .in("status", ["active", "stale"])
    .order("first_seen", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (parsed.type) request = request.eq("job_type", parsed.type);
  if (parsed.industry) request = request.eq("industry", parsed.industry);
  if (parsed.location) request = request.contains("locations", [parsed.location]);
  if (parsed.cohort) request = request.eq("cohort", parsed.cohort);
  if (parsed.confidence) request = request.eq("source_confidence", parsed.confidence);
  if (!canViewCuhkShenzhenOnly) request = request.eq("cuhk_shenzhen_only", false);
  if (parsed.deadlineWithin) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + parsed.deadlineWithin);
    request = request
      .not("deadline", "is", null)
      .lte("deadline", deadline.toISOString().slice(0, 10));
  }
  const search = safeSearchTerm(parsed.query);
  const searchExpression = search
    ? `company.ilike.%${search}%,title.ilike.%${search}%,summary.ilike.%${search}%,description.ilike.%${search}%`
    : null;
  const cursor = decodeCursor(parsed.cursor);
  const cursorExpression = cursor
    ? `first_seen.lt.${cursor.firstSeen},and(first_seen.eq.${cursor.firstSeen},id.lt.${cursor.id})`
    : null;
  if (searchExpression && cursorExpression) {
    request = request.or(
      `and(or(${searchExpression}),or(${cursorExpression}))`,
    );
  } else if (searchExpression || cursorExpression) {
    request = request.or(searchExpression ?? cursorExpression!);
  }

  const { data, error, count } = await request;
  if (error || !data) {
    console.error("Unable to load job page:", error?.message);
    const jobs = filterJobs(withCuhkShenzhenJobs(demoJobs, canViewCuhkShenzhenOnly), parsed);
    return { data: jobs.slice(0, limit), nextCursor: null, total: jobs.length };
  }
  const mapped = data.map(mapDatabaseJob);
  const hasMore = mapped.length > limit;
  const page = mapped.slice(0, limit);
  return {
    data: page,
    nextCursor: hasMore && page.length ? encodeCursor(page.at(-1)!) : null,
    total: count ?? page.length,
  };
}

export async function getJobs(input: JobQuery = {}): Promise<Job[]> {
  const canViewCuhkShenzhenOnly = await canViewCuhkShenzhenJobs();
  if (!isConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return filterJobs(
      withCuhkShenzhenJobs(demoJobs, canViewCuhkShenzhenOnly),
      input,
      new Date("2026-07-30T12:00:00+08:00"),
    );
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
    return filterJobs(withCuhkShenzhenJobs(demoJobs, canViewCuhkShenzhenOnly), input);
  }
  return filterJobs(
    withCuhkShenzhenJobs(data.map(mapDatabaseJob), canViewCuhkShenzhenOnly),
    input,
  );
}

export async function getJob(id: string) {
  const jobs = await getJobs({});
  return jobs.find((job) => job.id === id) ?? null;
}

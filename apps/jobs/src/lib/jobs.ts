import { demoJobs } from "@/data/demo-jobs";
import { unstable_cache } from "next/cache";
import { canViewCuhkShenzhenJobs, getCurrentUserId } from "@/lib/auth";
import { externalApplyUrl } from "@/lib/ingestion/cuhk-shenzhen";
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
  cuhkShenzhenOnly?: string;
  cursor?: string;
  limit?: string | number;
}

export interface JobPage {
  data: Job[];
  nextCursor: string | null;
  total: number;
}

export interface HomepageJobs {
  latest: Job[];
  urgent: Job[];
  total: number;
}

export interface PublicJobIndexEntry {
  id: string;
  lastModified: string;
}

export const GUEST_JOB_LIMIT = 10;

const jobSelectColumns = "id,company,title,program,job_type,batch,industry,locations,cohort,skills,summary,description,deadline,apply_url,source_url,source_name,source_confidence,first_seen,last_seen,updated_at,status,fingerprint,cuhk_shenzhen_only";

function hongKongDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function filterJobs(jobs: Job[], input: JobQuery, now = new Date()) {
  const parsed = jobQuerySchema.parse(input);
  const normalized = parsed.query.toLocaleLowerCase();
  const filtered = jobs.filter((job) => {
    if ((job.status !== "active" && job.status !== "stale") || isExpired(job.deadline, now)) return false;
    if (normalized && !toJobSearchText(job).includes(normalized)) return false;
    if (parsed.type && job.type !== parsed.type) return false;
    if (parsed.industry && job.industry !== parsed.industry) return false;
    if (parsed.location && !job.locations.includes(parsed.location)) return false;
    if (parsed.cohort && job.cohort !== parsed.cohort) return false;
    if (parsed.confidence && job.sourceConfidence !== parsed.confidence) return false;
    if (parsed.cuhkShenzhenOnly === "true" && !job.cuhkShenzhenOnly) return false;
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
  const sourceUrl = String(row.source_url);
  const description = String(row.description ?? "");
  const cuhkShenzhenOnly = Boolean(row.cuhk_shenzhen_only);
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
    description,
    deadline: (row.deadline as string | null) ?? null,
    applyUrl:
      (cuhkShenzhenOnly ? externalApplyUrl(description, sourceUrl) : null) ??
      (row.apply_url as string | null) ??
      null,
    sourceUrl,
    sourceName: String(row.source_name),
    sourceConfidence: row.source_confidence as Job["sourceConfidence"],
    firstSeen: String(row.first_seen),
    lastSeen: String(row.last_seen),
    updatedAt: (row.updated_at as string | null) ?? null,
    status: row.status as Job["status"],
    fingerprint: String(row.fingerprint),
    cuhkShenzhenOnly,
  };
}

function demoGuestJobs(now: Date) {
  return filterJobs(filterJobsByAudience(demoJobs, false), {}, now).slice(0, GUEST_JOB_LIMIT);
}

async function loadGuestJobs(today: string): Promise<Job[]> {
  const { data, error } = await createAdminClient()
    .from("jobs")
    .select(jobSelectColumns)
    .in("status", ["active", "stale"])
    .eq("cuhk_shenzhen_only", false)
    .or(`deadline.is.null,deadline.gte.${today}`)
    .order("first_seen", { ascending: false })
    .order("id", { ascending: false })
    .limit(GUEST_JOB_LIMIT);

  if (error || !data) {
    console.error("Unable to load guest job previews:", error?.message);
    return demoGuestJobs(new Date());
  }
  return data.map(mapDatabaseJob);
}

const cachedGuestJobs = unstable_cache(
  async (today: string) => loadGuestJobs(today),
  ["jobs-guest-previews-v1"],
  { revalidate: 300, tags: ["jobs-public"] },
);

export async function getGuestJobs(now = new Date()): Promise<Job[]> {
  if (!isConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return demoGuestJobs(now);
  }
  return cachedGuestJobs(hongKongDate(now));
}

export async function getPublicJobIndex(now = new Date()): Promise<PublicJobIndexEntry[]> {
  return (await getGuestJobs(now)).map((job) => ({
    id: job.id,
    lastModified: job.updatedAt ?? job.lastSeen ?? job.firstSeen,
  }));
}

export function guestJobPage(jobs: Job[], input: JobQuery, now = new Date()): JobPage {
  // Filters only narrow the fixed preview set. Cursor and requested page size
  // cannot be used to enumerate jobs beyond the ten public previews.
  const data = filterJobs(
    filterJobsByAudience(jobs.slice(0, GUEST_JOB_LIMIT), false),
    input,
    now,
  );
  return { data, nextCursor: null, total: data.length };
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

const cachedPublicJobsPage = unstable_cache(
  async (parsed: ReturnType<typeof jobQuerySchema.parse>) => loadJobsPage(parsed, false),
  ["jobs-public-page-v1"],
  { revalidate: 300, tags: ["jobs-public"] },
);

export async function getJobsPage(input: JobQuery = {}): Promise<JobPage> {
  const parsed = jobQuerySchema.parse(input);
  const limit = parsed.limit;
  const userId = await getCurrentUserId();
  if (!userId) return guestJobPage(await getGuestJobs(), parsed);
  const canViewCuhkShenzhenOnly = await canViewCuhkShenzhenJobs();

  if (parsed.cuhkShenzhenOnly === "true" && !canViewCuhkShenzhenOnly) {
    return { data: [], nextCursor: null, total: 0 };
  }

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

  const cacheablePublicPage = !canViewCuhkShenzhenOnly
    && !parsed.query
    && !parsed.cursor
    && !parsed.location
    && !parsed.cohort
    && !parsed.deadlineWithin;
  return cacheablePublicPage
    ? cachedPublicJobsPage(parsed)
    : loadJobsPage(parsed, canViewCuhkShenzhenOnly);
}

async function loadJobsPage(
  parsed: ReturnType<typeof jobQuerySchema.parse>,
  canViewCuhkShenzhenOnly: boolean,
): Promise<JobPage> {
  const limit = parsed.limit;
  const admin = createAdminClient();
  let request = admin
    .from("jobs")
    .select(jobSelectColumns, { count: "exact" })
    .in("status", ["active", "stale"])
    .order("first_seen", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (parsed.type) request = request.eq("job_type", parsed.type);
  if (parsed.industry) request = request.eq("industry", parsed.industry);
  if (parsed.location) request = request.contains("locations", [parsed.location]);
  if (parsed.cohort) request = request.eq("cohort", parsed.cohort);
  if (parsed.confidence) request = request.eq("source_confidence", parsed.confidence);
  if (parsed.cuhkShenzhenOnly === "true") {
    request = request.eq("cuhk_shenzhen_only", true);
  } else if (!canViewCuhkShenzhenOnly) {
    request = request.eq("cuhk_shenzhen_only", false);
  }
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

const cachedPublicHomepageJobs = unstable_cache(
  async (today: string, deadlineDate: string) => loadHomepageJobs(false, today, deadlineDate),
  ["jobs-public-homepage-v1"],
  { revalidate: 300, tags: ["jobs-public"] },
);

export async function getJobsByIds(ids: string[]): Promise<Job[]> {
  const uniqueIds = [...new Set(ids)].slice(0, 100);
  if (!uniqueIds.length) return [];
  const userId = await getCurrentUserId();
  if (!userId) {
    const byId = new Map((await getGuestJobs()).map((job) => [job.id, job]));
    return uniqueIds.flatMap((id) => byId.get(id) ?? []);
  }
  const canViewCuhkShenzhenOnly = await canViewCuhkShenzhenJobs();
  if (!isConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const matching = withCuhkShenzhenJobs(demoJobs, canViewCuhkShenzhenOnly)
      .filter((job) => uniqueIds.includes(job.id));
    return uniqueIds.flatMap((id) => matching.filter((job) => job.id === id));
  }

  const admin = createAdminClient();
  let request = admin
    .from("jobs")
    .select(jobSelectColumns)
    .in("status", ["active", "stale"])
    .in("id", uniqueIds);
  if (!canViewCuhkShenzhenOnly) {
    request = request.eq("cuhk_shenzhen_only", false);
  }
  const { data, error } = await request;

  if (error || !data) {
    console.error("Unable to load saved jobs:", error?.message);
    return [];
  }
  const byId = new Map(data.map((row) => {
    const job = mapDatabaseJob(row);
    return [job.id, job] as const;
  }));
  return uniqueIds.flatMap((id) => {
    const job = byId.get(id);
    return job ? [job] : [];
  });
}

export async function getJobs(input: JobQuery = {}): Promise<Job[]> {
  const userId = await getCurrentUserId();
  if (!userId) return guestJobPage(await getGuestJobs(), input).data;
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

export async function getHomepageJobs(now = new Date()): Promise<HomepageJobs> {
  const userId = await getCurrentUserId();
  if (!userId) {
    const jobs = await getGuestJobs(now);
    return {
      latest: jobs.slice(0, 4),
      urgent: jobs.filter((job) => {
        const days = daysUntil(job.deadline, now);
        return days !== null && days >= 0 && days <= 30;
      }).slice(0, 4),
      total: jobs.length,
    };
  }
  const canViewCuhkShenzhenOnly = await canViewCuhkShenzhenJobs();
  if (!isConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const jobs = filterJobs(withCuhkShenzhenJobs(demoJobs, canViewCuhkShenzhenOnly), {}, now);
    return {
      latest: jobs.slice(0, 4),
      urgent: jobs.filter((job) => {
        const days = daysUntil(job.deadline, now);
        return days !== null && days >= 0 && days <= 30;
      }).slice(0, 4),
      total: jobs.length,
    };
  }

  const today = hongKongDate(now);
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 30);
  const deadlineDate = hongKongDate(deadline);
  return canViewCuhkShenzhenOnly
    ? loadHomepageJobs(true, today, deadlineDate)
    : cachedPublicHomepageJobs(today, deadlineDate);
}

async function loadHomepageJobs(
  canViewCuhkShenzhenOnly: boolean,
  today: string,
  deadlineDate: string,
): Promise<HomepageJobs> {
  const admin = createAdminClient();
  let latestRequest = admin
    .from("jobs")
    .select(jobSelectColumns)
    .in("status", ["active", "stale"])
    .or(`deadline.is.null,deadline.gte.${today}`)
    .order("first_seen", { ascending: false })
    .order("id", { ascending: false })
    .limit(4);
  let urgentRequest = admin
    .from("jobs")
    .select(jobSelectColumns)
    .in("status", ["active", "stale"])
    .not("deadline", "is", null)
    .gte("deadline", today)
    .lte("deadline", deadlineDate)
    .order("first_seen", { ascending: false })
    .order("id", { ascending: false })
    .limit(4);
  let countRequest = admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["active", "stale"])
    .or(`deadline.is.null,deadline.gte.${today}`);
  if (!canViewCuhkShenzhenOnly) {
    latestRequest = latestRequest.eq("cuhk_shenzhen_only", false);
    urgentRequest = urgentRequest.eq("cuhk_shenzhen_only", false);
    countRequest = countRequest.eq("cuhk_shenzhen_only", false);
  }

  const [latestResult, urgentResult, countResult] = await Promise.all([
    latestRequest,
    urgentRequest,
    countRequest,
  ]);
  if (latestResult.error || urgentResult.error || countResult.error) {
    console.error("Unable to load homepage jobs:", latestResult.error?.message ?? urgentResult.error?.message ?? countResult.error?.message);
    const jobs = filterJobs(withCuhkShenzhenJobs(demoJobs, canViewCuhkShenzhenOnly), {});
    return {
      latest: jobs.slice(0, 4),
      urgent: jobs.filter((job) => {
        const days = daysUntil(job.deadline);
        return days !== null && days >= 0 && days <= 30;
      }).slice(0, 4),
      total: jobs.length,
    };
  }

  return {
    latest: (latestResult.data ?? []).map(mapDatabaseJob),
    urgent: (urgentResult.data ?? []).map(mapDatabaseJob),
    total: countResult.count ?? 0,
  };
}

export async function getSimilarJobs(job: Job, limit = 3): Promise<Job[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return (await getGuestJobs())
      .filter((item) => item.id !== job.id && (item.industry === job.industry || item.skills.some((skill) => job.skills.includes(skill))))
      .slice(0, limit);
  }
  const canViewCuhkShenzhenOnly = await canViewCuhkShenzhenJobs();
  if (!isConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return filterJobs(withCuhkShenzhenJobs(demoJobs, canViewCuhkShenzhenOnly), {})
      .filter((item) => item.id !== job.id && (item.industry === job.industry || item.skills.some((skill) => job.skills.includes(skill))))
      .slice(0, limit);
  }

  const admin = createAdminClient();
  let industryRequest = admin
    .from("jobs")
    .select(jobSelectColumns)
    .in("status", ["active", "stale"])
    .neq("id", job.id)
    .eq("industry", job.industry)
    .order("first_seen", { ascending: false })
    .limit(limit);
  let skillsRequest = job.skills.length
    ? admin
        .from("jobs")
        .select(jobSelectColumns)
        .in("status", ["active", "stale"])
        .neq("id", job.id)
        .overlaps("skills", job.skills)
        .order("first_seen", { ascending: false })
        .limit(limit)
    : null;
  if (!canViewCuhkShenzhenOnly) {
    industryRequest = industryRequest.eq("cuhk_shenzhen_only", false);
    skillsRequest = skillsRequest?.eq("cuhk_shenzhen_only", false) ?? null;
  }
  const [industryResult, skillsResult] = await Promise.all([
    industryRequest,
    skillsRequest ?? Promise.resolve({ data: [], error: null }),
  ]);
  if (industryResult.error || skillsResult.error) {
    console.error("Unable to load similar jobs:", industryResult.error?.message ?? skillsResult.error?.message);
    return [];
  }
  const unique = new Map<string, Job>();
  for (const row of [...(industryResult.data ?? []), ...(skillsResult.data ?? [])]) {
    const mapped = mapDatabaseJob(row);
    if (!isExpired(mapped.deadline, new Date())) unique.set(mapped.id, mapped);
  }
  return [...unique.values()].slice(0, limit);
}

const cachedPublicJob = unstable_cache(
  async (id: string) => loadJob(id, false),
  ["jobs-public-detail-v1"],
  { revalidate: 300, tags: ["jobs-public"] },
);

export async function getJob(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return (await getGuestJobs()).find((job) => job.id === id) ?? null;
  const canViewCuhkShenzhenOnly = await canViewCuhkShenzhenJobs();
  if (!isConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return filterJobs(
      withCuhkShenzhenJobs(demoJobs, canViewCuhkShenzhenOnly),
      {},
      new Date("2026-07-30T12:00:00+08:00"),
    ).find((job) => job.id === id) ?? null;
  }

  return canViewCuhkShenzhenOnly
    ? loadJob(id, true)
    : cachedPublicJob(id);
}

async function loadJob(id: string, canViewCuhkShenzhenOnly: boolean) {
  let request = createAdminClient()
    .from("jobs")
    .select(jobSelectColumns)
    .eq("id", id)
    .in("status", ["active", "stale"]);
  if (!canViewCuhkShenzhenOnly) {
    request = request.eq("cuhk_shenzhen_only", false);
  }
  const { data, error } = await request.maybeSingle();
  if (error) {
    console.error("Unable to load job:", error.message);
    return null;
  }
  if (!data) return null;
  return filterJobs([mapDatabaseJob(data)], {}, new Date())[0] ?? null;
}

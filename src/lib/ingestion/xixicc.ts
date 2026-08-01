import { rawXixiccJobsSchema } from "@/lib/schemas";
import { normalizeUrl, slugifyFingerprint } from "@/lib/utils";
import type { Industry, Job } from "@/types";

export const XIXICC_URL =
  "https://raw.githubusercontent.com/xixicc186/xixicc2027/main/jobs.json";

const knownIndustries = new Set<Industry>([
  "互联网",
  "半导体/硬件",
  "新能源车企",
  "传统车企",
  "游戏",
  "外企",
  "银行/金融",
  "制造业",
  "央国企",
  "军工/研究所",
  "高校/事业单位",
  "医药/生物",
  "快消/零售",
  "其他",
]);

export async function fetchXixiccJobs() {
  const response = await fetch(XIXICC_URL, {
    headers: { "User-Agent": "CampusRadar/1.0 (+public-job-index)" },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`xixicc2027 returned ${response.status}`);
  }
  const raw = rawXixiccJobsSchema.parse(await response.json());
  return raw.flatMap<Job>((item) => {
    const positions = item.positions.length
      ? item.positions
      : [item.program || `${item.batch || "校招"}岗位`];
    return positions.map((title, index) => {
      const applyUrl = normalizeUrl(item.apply_url);
      const type = item.batch?.includes("实习") ? "实习" : "秋招";
      const industry = knownIndustries.has(item.industry as Industry)
        ? (item.industry as Industry)
        : "其他";
      const firstSeen = item.first_seen ?? new Date().toISOString().slice(0, 10);
      const lastSeen = item.last_seen ?? firstSeen;
      const fingerprint = slugifyFingerprint([
        item.company,
        title,
        item.locations,
        item.batch,
        applyUrl,
      ]);
      return {
        id: `${fingerprint}_${index}`,
        company: item.company,
        title,
        program: item.program,
        type,
        batch: item.batch || (type === "实习" ? "实习" : "正式批"),
        industry,
        locations: item.locations,
        cohort: item.cohort || "不限",
        skills: [],
        summary: [
          item.program ? `${item.program}项目。` : "",
          `${item.company}${type === "实习" ? "实习" : "校园招聘"}岗位，`,
          item.locations.length
            ? `工作地点包括${item.locations.slice(0, 5).join("、")}。`
            : "工作地点待招聘方确认。",
        ]
          .filter(Boolean)
          .join(""),
        deadline: item.deadline,
        applyUrl,
        sourceUrl:
          "https://github.com/xixicc186/xixicc2027/blob/main/README.md",
        sourceName: "xixicc2027",
        sourceConfidence:
          item.confirmed_by && item.confirmed_by > 1 ? "已核验" : "社区线索",
        firstSeen,
        lastSeen,
        status: "active",
        fingerprint,
      };
    });
  });
}

/**
 * The upstream community feed can occasionally contain the same position more
 * than once. PostgreSQL cannot upsert two rows with the same conflict key in a
 * single statement, so collapse those records before batching writes.
 */
export function dedupeJobsByFingerprint(jobs: Job[]) {
  return Array.from(
    jobs.reduce((unique, job) => {
      const existing = unique.get(job.fingerprint);
      if (!existing || job.lastSeen > existing.lastSeen) {
        unique.set(job.fingerprint, job);
      }
      return unique;
    }, new Map<string, Job>()),
  ).map(([, job]) => job);
}

export function toJobRow(job: Job) {
  return {
    id: job.id,
    company: job.company,
    title: job.title,
    program: job.program,
    job_type: job.type,
    batch: job.batch,
    industry: job.industry,
    locations: job.locations,
    cohort: job.cohort,
    skills: job.skills,
    summary: job.summary.slice(0, 500),
    description: job.description?.slice(0, 12_000) ?? "",
    deadline: job.deadline || null,
    apply_url: job.applyUrl,
    source_url: job.sourceUrl,
    source_name: job.sourceName,
    source_confidence: job.sourceConfidence,
    first_seen: job.firstSeen,
    last_seen: job.lastSeen,
    status: job.status,
    fingerprint: job.fingerprint,
    cuhk_shenzhen_only: Boolean(job.cuhkShenzhenOnly),
  };
}

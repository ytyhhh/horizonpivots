import { INDUSTRIES } from "@/types";
import { fetchSafeText } from "@/lib/ingestion/web-safety";
import {
  assessOfficialSource,
  isBlockedRecruitingDomain,
  rootDomain,
} from "@/lib/ingestion/trust";
import { normalizeUrl } from "@/lib/utils";
import type { SourceAdapter } from "@/lib/ingestion/adapters";
import {
  rotatingOfficialCompanySeeds,
  type OfficialCompanySeed,
} from "@/data/official-company-seeds";

const TAVILY_API_URL = "https://api.tavily.com/search";
const MAX_RESULTS_PER_QUERY = 5;
const DISCOVERY_CONCURRENCY = 5;
const TRUST_THRESHOLD = 85;
const MAX_CANDIDATES_PER_RUN = 30;

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

interface TavilyResponse {
  results?: TavilyResult[];
  request_id?: string;
}

export interface OfficialSourceCandidate {
  company: string;
  title: string;
  url: string;
  rootDomain: string;
  canonicalUrl: string;
  companyDomain: string;
  kind: SourceAdapter["kind"];
  trustScore: number;
  trustSignals: string[];
  trusted: boolean;
  reason: string;
}

function dayOfYear() {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  return Math.floor((now.getTime() - start) / 86_400_000);
}

interface DiscoveryTarget {
  query: string;
  seed?: OfficialCompanySeed;
}

export function discoveryTargets(day = dayOfYear()): DiscoveryTarget[] {
  const rotatingIndustry = INDUSTRIES[day % INDUSTRIES.length];
  const generic = [
    "2027届 秋招 校园招聘 官方 网申",
    "2027 校园招聘 招聘官网",
    "秋季校园招聘 官方招聘 最新",
    "日常实习 官方招聘 最新",
    `${rotatingIndustry} 2027届 秋招 官方招聘`,
  ].map((query) => ({ query }));
  const seeded = rotatingOfficialCompanySeeds(day).map((seed) => ({
    query: `${seed.company} 2027届 秋招 日常实习 官方招聘`,
    seed,
  }));
  return [...generic, ...seeded];
}

export function discoveryQueries(day = dayOfYear()) {
  return discoveryTargets(day).map(({ query }) => query);
}

async function tavilySearch(query: string) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not configured");
  const response = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Project-ID": "campus-radar-official-discovery",
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      topic: "general",
      country: "china",
      time_range: "month",
      include_answer: false,
      include_raw_content: false,
      max_results: MAX_RESULTS_PER_QUERY,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await response.json().catch(() => null)) as TavilyResponse | null;
  if (!response.ok) throw new Error(`Tavily search failed (${response.status})`);
  return payload?.results ?? [];
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

function sourceKind(url: string): SourceAdapter["kind"] {
  const pathname = new URL(url).pathname.toLocaleLowerCase();
  if (pathname.endsWith(".xml") || pathname.includes("sitemap")) return "sitemap";
  if (/(rss|atom|feed)/.test(pathname)) return "rss";
  return "html";
}

async function inspectResult(
  result: TavilyResult,
  seed?: OfficialCompanySeed,
): Promise<OfficialSourceCandidate | null> {
  const url = normalizeUrl(result.url);
  if (!url) return null;
  const parsed = new URL(url);
  if (isBlockedRecruitingDomain(parsed.hostname)) return null;
  if (/\.(pdf|docx?|xlsx?|zip|rar)(?:$|\?)/i.test(parsed.pathname)) return null;

  try {
    const pageHtml = await fetchSafeText(url);
    let homepageHtml = "";
    try {
      homepageHtml = await fetchSafeText(`https://${seed?.companyDomain ?? rootDomain(parsed.hostname)}`);
    } catch {
      // A missing homepage does not make the candidate unsafe; it only removes a trust signal.
    }
    const assessment = assessOfficialSource({
      url,
      title: result.title?.trim() || "招聘页面",
      pageHtml,
      homepageHtml,
      expectedCompany: seed?.company,
      expectedAliases: seed?.aliases,
    });
    const canonicalUrl = normalizeUrl(url)!;
    return {
      company: assessment.company || seed?.company || rootDomain(parsed.hostname),
      title: result.title?.trim().slice(0, 180) || "招聘页面",
      url,
      rootDomain: rootDomain(parsed.hostname),
      canonicalUrl,
      companyDomain: seed?.companyDomain ?? rootDomain(parsed.hostname),
      kind: sourceKind(url),
      trustScore: assessment.score,
      trustSignals: assessment.signals,
      trusted: assessment.score >= TRUST_THRESHOLD,
      reason: assessment.score >= TRUST_THRESHOLD
        ? `官方信任评分 ${assessment.score}，可自动采集`
        : `官方信任评分 ${assessment.score}，需要人工确认来源`,
    };
  } catch {
    return null;
  }
}

export async function discoverOfficialRecruitingPages() {
  const resultGroups = await Promise.all(
    discoveryTargets().map(async (target) => ({ target, results: await tavilySearch(target.query) })),
  );
  const unique = new Map<string, { result: TavilyResult; seed?: OfficialCompanySeed }>();
  resultGroups.forEach(({ target, results }) => results.forEach((result) => {
    const url = normalizeUrl(result.url);
    const existing = url ? unique.get(url) : null;
    if (url && (!existing || (!existing.seed && target.seed))) {
      unique.set(url, { result, seed: target.seed });
    }
  }));
  const inspected = await mapWithConcurrency(
    [...unique.values()].slice(0, MAX_CANDIDATES_PER_RUN),
    DISCOVERY_CONCURRENCY,
    ({ result, seed }) => inspectResult(result, seed),
  );
  return inspected.filter((candidate): candidate is OfficialSourceCandidate => Boolean(candidate));
}

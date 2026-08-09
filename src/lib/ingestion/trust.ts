import { load } from "cheerio";

const MULTI_PART_SUFFIXES = new Set(["com.cn", "net.cn", "org.cn", "gov.cn", "edu.cn", "co.uk"]);
const BLOCKED_ROOT_DOMAINS = new Set([
  "github.com",
  "gitee.com",
  "nowcoder.com",
  "yingjiesheng.com",
  "zhipin.com",
  "liepin.com",
  "51job.com",
  "zhihu.com",
  "weibo.com",
  "mp.weixin.qq.com",
  "xiaohongshu.com",
]);
const SHORTENER_DOMAINS = new Set(["t.cn", "bit.ly", "tinyurl.com", "dwz.cn", "url.cn"]);
const RECRUITING_PATTERN = /(jobs?|careers?|career|campus|graduate|recruit|招聘|校招|秋招|实习)/i;
const CURRENT_RECRUITING_PATTERN = /(2027\s*届?|秋季?招聘|秋招|校园招聘|校招|日常实习|internship)/i;

export function rootDomain(hostname: string) {
  const host = hostname.toLocaleLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  const suffix = parts.slice(-2).join(".");
  return MULTI_PART_SUFFIXES.has(suffix) ? parts.slice(-3).join(".") : suffix;
}

export function isBlockedRecruitingDomain(hostname: string) {
  const host = hostname.toLocaleLowerCase();
  const root = rootDomain(host);
  return BLOCKED_ROOT_DOMAINS.has(host) || BLOCKED_ROOT_DOMAINS.has(root) || SHORTENER_DOMAINS.has(root);
}

function jsonLdOrganizations(html: string) {
  const $ = load(html);
  const organizations = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    const type = String(record["@type"] ?? "");
    if (type === "JobPosting") {
      const hiring = record.hiringOrganization;
      if (typeof hiring === "object" && hiring) {
        const name = String((hiring as Record<string, unknown>).name ?? "").trim();
        if (name) organizations.add(name);
      }
    }
    Object.values(record).forEach(visit);
  };
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      visit(JSON.parse($(element).text()));
    } catch {
      // Invalid JSON-LD is not a trust signal.
    }
  });
  return [...organizations];
}

function homepageLinksToRecruiting(homeHtml: string, candidateUrl: string) {
  const $ = load(homeHtml);
  const candidate = new URL(candidateUrl);
  const canonicalCandidate = candidate.toString().replace(/\/$/, "");
  let matched = false;
  $("a[href]").each((_, element) => {
    if (matched) return;
    try {
      const target = new URL($(element).attr("href")!, candidate.origin);
      const label = $(element).text();
      const exactExternalLink = target.toString().replace(/\/$/, "") === canonicalCandidate;
      if (
        exactExternalLink ||
        (rootDomain(target.hostname) === rootDomain(candidate.hostname) &&
          RECRUITING_PATTERN.test(`${target.pathname} ${label}`))
      ) {
        matched = true;
      }
    } catch {
      // Ignore malformed links.
    }
  });
  return matched;
}

export interface TrustAssessment {
  score: number;
  signals: string[];
  company: string;
}

export function assessOfficialSource(input: {
  url: string;
  title: string;
  pageHtml: string;
  homepageHtml?: string;
  expectedCompany?: string;
  expectedAliases?: string[];
}): TrustAssessment {
  const url = new URL(input.url);
  if (isBlockedRecruitingDomain(url.hostname)) return { score: 0, signals: ["blocked-domain"], company: "" };

  const organizations = jsonLdOrganizations(input.pageHtml);
  const company = input.expectedCompany || organizations[0] || input.title.split(/[｜|—\-]/)[0]?.trim().slice(0, 120) || "";
  const signals: string[] = [];
  let score = 0;
  const linkedFromHomepage = Boolean(
    input.homepageHtml && homepageLinksToRecruiting(input.homepageHtml, input.url),
  );
  if (linkedFromHomepage) {
    score += 50;
    signals.push("corporate-homepage-link");
  }
  if (organizations.some((name) => input.pageHtml.includes(name) && input.title.includes(name))) {
    score += 25;
    signals.push("jsonld-hiring-organization");
  }
  const expectedNames = [input.expectedCompany, ...(input.expectedAliases ?? [])]
    .filter((value): value is string => Boolean(value));
  if (
    linkedFromHomepage &&
    expectedNames.some((name) => `${input.title}\n${input.pageHtml}`.toLocaleLowerCase().includes(name.toLocaleLowerCase()))
  ) {
    score += 25;
    signals.push("verified-seed-company");
  }
  if (RECRUITING_PATTERN.test(`${url.hostname}${url.pathname}`)) {
    score += 15;
    signals.push("recruiting-url");
  }
  if (CURRENT_RECRUITING_PATTERN.test(`${input.title}\n${input.pageHtml}`)) {
    score += 10;
    signals.push("current-campus-keywords");
  }
  return { score: Math.min(score, 100), signals, company };
}

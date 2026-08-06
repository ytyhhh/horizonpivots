import { describe, expect, it } from "vitest";
import {
  extractJsonLdOfficialJobs,
  extractSelectorOfficialJobs,
  officialExtractionToJob,
  validateOfficialExtraction,
  type OfficialSourceRecord,
} from "@/lib/ingestion/official-extraction";
import { assessOfficialSource, isBlockedRecruitingDomain, rootDomain } from "@/lib/ingestion/trust";

const source: OfficialSourceRecord = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "示例科技官方招聘",
  url: "https://jobs.example.com/campus",
  root_domain: "example.com",
  trust_score: 100,
  config: { company: "示例科技" },
};

function jobPostingHtml(overrides: Record<string, unknown> = {}) {
  const posting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "后端开发工程师",
    description: "示例科技2027届校园招聘，负责服务端系统开发。",
    hiringOrganization: { "@type": "Organization", name: "示例科技" },
    employmentType: "FULL_TIME",
    datePosted: "2026-08-01",
    validThrough: "2026-09-30",
    url: "https://jobs.example.com/job/123",
    identifier: "123",
    jobLocation: { address: { addressLocality: "深圳" } },
    ...overrides,
  };
  return `<html><head><title>示例科技｜2027届校园招聘</title><script type="application/ld+json">${JSON.stringify(posting)}</script></head><body>示例科技2027届校园招聘 <a href="https://jobs.example.com/job/123">申请</a> 2026-09-30</body></html>`;
}

describe("official source trust", () => {
  it("awards all four deterministic trust signals", () => {
    const assessment = assessOfficialSource({
      url: source.url,
      title: "示例科技｜2027届校园招聘",
      pageHtml: jobPostingHtml(),
      homepageHtml: '<a href="https://jobs.example.com/campus">校园招聘</a>',
    });
    expect(assessment.score).toBe(100);
    expect(assessment.signals).toEqual([
      "corporate-homepage-link",
      "jsonld-hiring-organization",
      "recruiting-url",
      "current-campus-keywords",
    ]);
  });

  it("blocks aggregators and calculates registrable Chinese domains", () => {
    expect(isBlockedRecruitingDomain("www.nowcoder.com")).toBe(true);
    expect(isBlockedRecruitingDomain("mp.weixin.qq.com")).toBe(true);
    expect(rootDomain("career.example.com.cn")).toBe("example.com.cn");
  });
});

describe("official job extraction", () => {
  it("extracts, validates and maps JSON-LD jobs with stable identities", () => {
    const html = jobPostingHtml();
    const [item] = extractJsonLdOfficialJobs(html, source.url, "示例科技");
    expect(item.extraction).toMatchObject({
      company: "示例科技",
      title: "后端开发工程师",
      type: "秋招",
      cohort: "2027届",
      locations: ["深圳"],
      deadline: "2026-09-30",
    });
    expect(validateOfficialExtraction(item, html, source.url, source)).toBe(true);
    const first = officialExtractionToJob(item, source.url, source, new Date("2026-08-06T00:00:00Z"));
    const second = officialExtractionToJob(item, source.url, source, new Date("2026-08-07T00:00:00Z"));
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.sourceConfidence).toBe("官方");
  });

  it("rejects an application link outside the official or approved ATS domains", () => {
    const html = jobPostingHtml({ url: "https://evil.example.net/apply" }).replace(
      "https://jobs.example.com/job/123",
      "https://evil.example.net/apply",
    );
    const [item] = extractJsonLdOfficialJobs(html, source.url, "示例科技");
    expect(validateOfficialExtraction(item, html, source.url, source)).toBe(false);
  });

  it("ignores spring and experienced hiring even when structured as JobPosting", () => {
    expect(extractJsonLdOfficialJobs(jobPostingHtml({ description: "2027届春招岗位" }), source.url)).toEqual([]);
    expect(extractJsonLdOfficialJobs(jobPostingHtml({ description: "社会招聘，三年经验" }), source.url)).toEqual([]);
  });

  it("supports configured selectors before using an LLM fallback", () => {
    const html = `<div class="job" data-id="abc"><h2>算法实习生</h2><span class="company">示例科技</span><span class="location">上海、深圳</span><p>日常实习，2026-09-30截止</p><a class="apply" href="/job/abc">申请</a></div>`;
    const [item] = extractSelectorOfficialJobs(html, "https://jobs.example.com/list", {
      itemSelector: ".job",
      titleSelector: "h2",
      companySelector: ".company",
      locationSelector: ".location",
      applyUrlSelector: ".apply",
    });
    expect(item).toMatchObject({
      method: "selectors",
      extraction: { title: "算法实习生", type: "实习", cohort: "不限", locations: ["上海", "深圳"] },
    });
  });
});


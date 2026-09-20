import { describe, expect, it } from "vitest";
import {
  buildJobStructuredData,
  jobCanonicalUrl,
  jobMetaDescription,
  serializeJsonLd,
} from "@/lib/seo";
import type { Job } from "@/types";

const publicJob: Job = {
  id: "example-job",
  company: "示例科技",
  title: "软件工程师",
  type: "秋招",
  batch: "正式批",
  industry: "互联网",
  locations: ["深圳", "香港"],
  cohort: "2027届",
  skills: ["TypeScript", "React"],
  summary: "参与核心产品研发。",
  description: "负责产品功能开发、测试与持续改进。",
  deadline: "2026-10-31",
  applyUrl: "https://example.com/apply",
  sourceUrl: "https://example.com/jobs/example-job",
  sourceName: "招聘官网",
  sourceConfidence: "官方",
  firstSeen: "2026-09-01",
  lastSeen: "2026-09-20",
  status: "active",
  fingerprint: "job_example",
};

describe("jobs SEO helpers", () => {
  it("builds canonical job URLs and concise descriptions", () => {
    expect(jobCanonicalUrl(publicJob.id)).toBe(
      "https://jobs.horizonpivots.com/jobs/example-job",
    );
    expect(jobMetaDescription(publicJob)).toContain("示例科技招聘软件工程师");
    expect(jobMetaDescription(publicJob).length).toBeLessThanOrEqual(155);
  });

  it("publishes complete public jobs as JobPosting structured data", () => {
    const data = buildJobStructuredData(publicJob) as { "@graph": Array<Record<string, unknown>> };
    const posting = data["@graph"].find((item) => item["@type"] === "JobPosting");

    expect(posting).toMatchObject({
      title: "软件工程师",
      datePosted: "2026-09-01",
      validThrough: "2026-10-31T23:59:59+08:00",
      employmentType: "FULL_TIME",
      directApply: false,
    });
    expect(posting?.jobLocation).toEqual([
      expect.objectContaining({ address: expect.objectContaining({ addressCountry: "CN" }) }),
      expect.objectContaining({ address: expect.objectContaining({ addressCountry: "HK" }) }),
    ]);
  });

  it("does not claim JobPosting eligibility without a description or application URL", () => {
    const data = buildJobStructuredData({
      ...publicJob,
      description: "",
      applyUrl: null,
    }) as { "@graph": Array<Record<string, unknown>> };

    expect(data["@graph"].map((item) => item["@type"])).toEqual(["BreadcrumbList"]);
  });

  it("escapes HTML-significant characters in JSON-LD", () => {
    expect(serializeJsonLd({ text: "</script>" })).not.toContain("</script>");
  });
});

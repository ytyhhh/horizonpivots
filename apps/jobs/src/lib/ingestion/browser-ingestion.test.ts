import { describe, expect, it } from "vitest";
import { browserPageBelongsToSource } from "@/lib/ingestion/browser-ingestion";

const source = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "示例公司官方招聘",
  url: "https://jobs.feishu.cn/example/campus",
  root_domain: "feishu.cn",
  canonical_url: "https://jobs.feishu.cn/example/campus",
  company_domain: "example.com",
  trust_score: 100,
  config: { company: "示例公司", approvedDomains: ["mokahr.com"] },
  enabled: true,
  confidence: "官方",
  consecutive_failures: 0,
  fetch_mode: "auto",
} as const;

describe("official browser payload boundaries", () => {
  it("accepts only HTTPS pages on the source, company, or approved ATS domains", () => {
    expect(browserPageBelongsToSource("https://jobs.feishu.cn/example/job/1", source)).toBe(true);
    expect(browserPageBelongsToSource("https://career.example.com/campus", source)).toBe(true);
    expect(browserPageBelongsToSource("https://example.mokahr.com/job/1", source)).toBe(true);
    expect(browserPageBelongsToSource("https://evil.example.net/job/1", source)).toBe(false);
    expect(browserPageBelongsToSource("http://jobs.feishu.cn/example/job/1", source)).toBe(false);
  });
});

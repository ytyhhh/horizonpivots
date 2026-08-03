import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dedupeJobsByFingerprint,
  fetchXixiccJobs,
} from "@/lib/ingestion/xixicc";

afterEach(() => vi.restoreAllMocks());

describe("xixicc2027 adapter", () => {
  it("expands position arrays and generates stable normalized jobs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              company: "示例科技",
              cohort: "2027届",
              batch: "实习",
              program: null,
              industry: "互联网",
              positions: ["后端实习生", "产品实习生"],
              locations: ["深圳"],
              apply_url: "https://example.com/apply?utm_source=test",
              deadline: null,
              first_seen: "2026-07-30",
              last_seen: "2026-07-30",
              confirmed_by: 2,
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const jobs = await fetchXixiccJobs();
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      company: "示例科技",
      type: "实习",
      sourceConfidence: "已核验",
      applyUrl: "https://example.com/apply",
    });
    expect(jobs[0].fingerprint).not.toBe(jobs[1].fingerprint);
  });

  it("rejects invalid upstream data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ positions: [] }]), { status: 200 }),
      ),
    );
    await expect(fetchXixiccJobs()).rejects.toThrow();
  });

  it("collapses duplicate source positions before database batching", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              company: "示例科技",
              cohort: "2027届",
              batch: "秋招",
              industry: "互联网",
              positions: ["后端开发工程师"],
              locations: ["深圳"],
              apply_url: "https://example.com/apply",
              last_seen: "2026-07-30",
            },
            {
              company: "示例科技",
              cohort: "2027届",
              batch: "秋招",
              industry: "互联网",
              positions: ["后端开发工程师"],
              locations: ["深圳"],
              apply_url: "https://example.com/apply",
              last_seen: "2026-07-31",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const jobs = await fetchXixiccJobs();
    const uniqueJobs = dedupeJobsByFingerprint(jobs);

    expect(jobs).toHaveLength(2);
    expect(uniqueJobs).toHaveLength(1);
    expect(uniqueJobs[0].lastSeen).toBe("2026-07-31");
  });

  it("classifies spring recruiting independently from autumn recruiting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              company: "示例科技",
              batch: "2027 春招",
              industry: "互联网",
              positions: ["后端开发工程师"],
              locations: ["深圳"],
              apply_url: "https://example.com/apply",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    await expect(fetchXixiccJobs()).resolves.toMatchObject([{ type: "春招" }]);
  });
});

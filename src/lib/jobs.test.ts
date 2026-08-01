import { describe, expect, it } from "vitest";
import { demoJobs } from "@/data/demo-jobs";
import { filterJobs, filterJobsByAudience } from "@/lib/jobs";

const now = new Date("2026-07-30T12:00:00+08:00");

describe("job filtering", () => {
  it("searches company, role and skills", () => {
    expect(filterJobs(demoJobs, { query: "Python" }, now).length).toBeGreaterThan(0);
    expect(filterJobs(demoJobs, { query: "字节跳动" }, now)[0].company).toBe(
      "字节跳动",
    );
  });

  it("combines type and industry filters", () => {
    const results = filterJobs(
      demoJobs,
      { type: "实习", industry: "半导体/硬件" },
      now,
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((job) => job.type === "实习")).toBe(true);
    expect(results.every((job) => job.industry === "半导体/硬件")).toBe(true);
  });

  it("has no duplicate fingerprints in the demo dataset", () => {
    expect(new Set(demoJobs.map((job) => job.fingerprint)).size).toBe(
      demoJobs.length,
    );
  });

  it("does not expose school-exclusive jobs without the required audience", () => {
    const jobs = [
      demoJobs[0],
      { ...demoJobs[1], id: "exclusive", cuhkShenzhenOnly: true },
    ];
    expect(filterJobsByAudience(jobs, false)).toEqual([demoJobs[0]]);
    expect(filterJobsByAudience(jobs, true)).toHaveLength(2);
  });
});

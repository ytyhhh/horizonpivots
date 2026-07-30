import { describe, expect, it } from "vitest";
import { demoJobs, demoProfile } from "@/data/demo-jobs";
import { isEligible, recommendJobs } from "@/lib/recommendation";

const now = new Date("2026-07-30T12:00:00+08:00");

describe("recommendation ranking", () => {
  it("filters ineligible cohorts and expired jobs", () => {
    const wrongCohort = { ...demoJobs[0], id: "wrong", cohort: "2028届" };
    const expired = { ...demoJobs[0], id: "expired", deadline: "2026-07-01" };
    expect(isEligible(demoProfile, wrongCohort, now)).toBe(false);
    expect(isEligible(demoProfile, expired, now)).toBe(false);
  });

  it("respects explicitly excluded companies", () => {
    expect(
      isEligible(
        { ...demoProfile, excludedCompanies: [demoJobs[0].company] },
        demoJobs[0],
        now,
      ),
    ).toBe(false);
  });

  it("returns deterministic, descending results with explainable fields", () => {
    const recommendations = recommendJobs(demoProfile, demoJobs, now);
    expect(recommendations.length).toBeGreaterThan(5);
    expect(recommendations[0].totalScore).toBeGreaterThanOrEqual(
      recommendations[1].totalScore,
    );
    expect(recommendations[0].explanation.length).toBeGreaterThan(10);
    expect(["高匹配", "值得尝试", "拓展机会"]).toContain(
      recommendations[0].tier,
    );
  });

  it("uses weights that sum to one", () => {
    const total = 0.5 + 0.25 + 0.1 + 0.1 + 0.05;
    expect(total).toBe(1);
  });
});

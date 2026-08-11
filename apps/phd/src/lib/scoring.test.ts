import { describe, expect, it } from "vitest";
import { calculateBreakdown, rerank, tokenizeQuery, weightedScore } from "@/lib/scoring";
import type { FacultyRecommendation, SearchQuery } from "@/lib/types";

const query: SearchQuery = {
  selectedInstitutionIds: ["I97018004"],
  doctoralField: "Computer Science",
  researchDescription: "Multimodal learning for trustworthy healthcare systems",
  researchKeywords: ["multimodal", "healthcare", "trustworthy"],
  profileId: "profile",
  profile: {
    id: "profile",
    education: "Master's",
    major: "Data Science",
    researchExperience: "Medical image classification",
    skills: ["Python", "causal inference"],
  },
};

describe("scoring", () => {
  it("removes English stop words from topic signals", () => {
    expect(tokenizeQuery(query)).not.toContain("and");
    expect(tokenizeQuery(query)).not.toContain("for");
    expect(tokenizeQuery(query)).toContain("trustworthy");
  });

  it("prioritizes explicit topic overlap", () => {
    const matched = calculateBreakdown({
      titles: ["Trustworthy multimodal learning for healthcare"],
      years: [2026, 2025, 2024],
      query,
      officiallyVerified: true,
      recruitingSignal: false,
    });
    const unrelated = calculateBreakdown({
      titles: ["Medieval poetry and manuscript archives"],
      years: [2026],
      query,
      officiallyVerified: true,
      recruitingSignal: false,
    });
    expect(matched.topicFit).toBeGreaterThan(unrelated.topicFit);
    expect(weightedScore(matched)).toBeGreaterThan(weightedScore(unrelated));
  });

  it("keeps the combined result capped at twenty", () => {
    const items = Array.from({ length: 25 }, (_, index) => ({
      id: String(index),
      name: `Researcher ${index}`,
      matchScore: index,
    })) as FacultyRecommendation[];
    const ranked = rerank(items);
    expect(ranked).toHaveLength(20);
    expect(ranked[0].matchScore).toBe(24);
  });
});

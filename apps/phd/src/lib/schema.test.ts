import { describe, expect, it } from "vitest";
import { searchQuerySchema } from "@/lib/schema";

const base = {
  selectedInstitutionIds: ["I97018004"],
  doctoralField: "Education",
  researchDescription: "How teachers adopt generative AI in classroom practice",
  researchKeywords: ["generative AI"],
  profileId: "profile",
};

describe("search query validation", () => {
  it("requires at least one selected school", () => {
    expect(searchQuerySchema.safeParse({ ...base, selectedInstitutionIds: [] }).success).toBe(false);
  });

  it("rejects more than ten schools", () => {
    expect(searchQuerySchema.safeParse({ ...base, selectedInstitutionIds: Array.from({ length: 11 }, (_, index) => `I${index}`) }).success).toBe(false);
  });

  it("accepts a valid institution-scoped query", () => {
    expect(searchQuerySchema.safeParse(base).success).toBe(true);
  });
});

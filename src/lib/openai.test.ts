import { describe, expect, it } from "vitest";
import { normalizeExtractionPayload } from "@/lib/openai";

describe("DeepSeek resume extraction normalization", () => {
  it("normalizes common non-schema DeepSeek output without retaining extra fields", () => {
    expect(
      normalizeExtractionPayload({
        graduation_year: "2027届毕业",
        education: " 硕士研究生 ",
        major: "计算机科学与技术",
        skills: "Python、SQL，机器学习",
        experiences: ["在某公司完成数据分析项目。"],
        project_domains: "数据分析；推荐系统",
        name: "不应进入画像",
      }),
    ).toEqual({
      graduationYear: 2027,
      education: "硕士研究生",
      major: "计算机科学与技术",
      skills: ["Python", "SQL", "机器学习"],
      experiences: ["在某公司完成数据分析项目。"],
      projectDomains: ["数据分析", "推荐系统"],
    });
  });
});

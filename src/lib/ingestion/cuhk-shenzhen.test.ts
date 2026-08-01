import { describe, expect, it } from "vitest";
import { parseCuhkShenzhenJobs } from "@/lib/ingestion/cuhk-shenzhen";

describe("CUHK-Shenzhen job ingestion", () => {
  const payload = {
    jobs: [
      {
        id: "468922",
        company: "示例科技",
        title: "2027 算法实习生",
        type: "实习",
        locations: ["深圳"],
        cohort: "2027届",
        summary: "公开招聘信息",
        description: "负责算法模型的训练与部署。",
        deadline: "2026-09-30",
        sourceUrl: "https://career.cuhk.edu.cn/job/view/id/468922",
        firstSeen: "2026-08-01",
      },
    ],
  };

  it("marks every imported listing as CUHK-Shenzhen-only", () => {
    const [job] = parseCuhkShenzhenJobs(payload);
    expect(job).toMatchObject({
      id: "cuhksz_468922",
      cuhkShenzhenOnly: true,
      sourceConfidence: "官方",
      sourceName: "香港中文大学（深圳）职业规划与发展处",
      description: "负责算法模型的训练与部署。",
    });
  });

  it("rejects jobs from non-school sources", () => {
    expect(() =>
      parseCuhkShenzhenJobs({
        ...payload,
        jobs: [{ ...payload.jobs[0], sourceUrl: "https://example.com/job/468922" }],
      }),
    ).toThrow("来源必须为港中深就业中心网站");
  });
});

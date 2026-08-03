import type { Metadata } from "next";
import { JobsExplorer } from "@/components/jobs-explorer";
import { canViewCuhkShenzhenJobs } from "@/lib/auth";
import { getJobsPage } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "岗位库",
  description: "筛选最新秋招与实习岗位。",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const canFilterCuhkShenzhen = await canViewCuhkShenzhenJobs();
  const initialCuhkShenzhenOnly =
    canFilterCuhkShenzhen && params.cuhkShenzhenOnly === "true";
  const initialPage = await getJobsPage({
    industry: typeof params.industry === "string" ? params.industry : undefined,
    cuhkShenzhenOnly: initialCuhkShenzhenOnly ? "true" : undefined,
    limit: 50,
  });

  return (
    <div className="page-shell pb-10 pt-7 sm:pb-14 sm:pt-10">
      <div className="max-w-2xl">
        <p className="eyebrow">Opportunity index</p>
        <h1 className="utility-title mt-5">
          找到值得投递的岗位
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
          信息来自公开招聘渠道，按最新收录排序。申请前请以招聘方页面为准。
        </p>
      </div>
      <div className="mt-8">
        <JobsExplorer
          initialJobs={initialPage.data}
          initialCursor={initialPage.nextCursor}
          initialTotal={initialPage.total}
          initialIndustry={typeof params.industry === "string" ? params.industry : "全部行业"}
          initialCuhkShenzhenOnly={initialCuhkShenzhenOnly}
          canFilterCuhkShenzhen={canFilterCuhkShenzhen}
        />
      </div>
    </div>
  );
}

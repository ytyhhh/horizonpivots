import type { Metadata } from "next";
import { JobsExplorer } from "@/components/jobs-explorer";
import { canViewCuhkShenzhenJobs, getCurrentUserId } from "@/lib/auth";
import { getJobsPage } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "校招与实习岗位库",
  description: "按行业、地点与届别筛选最新秋招、春招和实习岗位，查看截止日期、岗位说明、信息来源与申请入口。",
  alternates: { canonical: "/jobs" },
  openGraph: {
    type: "website",
    url: "/jobs",
    title: "校招与实习岗位库",
    description: "按行业、地点与届别筛选公开校招、春招和实习岗位。",
  },
  twitter: {
    card: "summary",
    title: "校招与实习岗位库",
    description: "按行业、地点与届别筛选公开校招、春招和实习岗位。",
  },
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [userId, canFilterCuhkShenzhen] = await Promise.all([
    getCurrentUserId(),
    canViewCuhkShenzhenJobs(),
  ]);
  const initialCuhkShenzhenOnly =
    canFilterCuhkShenzhen && params.cuhkShenzhenOnly === "true";
  const initialPage = await getJobsPage({
    industry: typeof params.industry === "string" ? params.industry : undefined,
    cuhkShenzhenOnly: initialCuhkShenzhenOnly ? "true" : undefined,
    limit: userId ? 50 : 10,
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
          isSignedIn={Boolean(userId)}
        />
      </div>
    </div>
  );
}

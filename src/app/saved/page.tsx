import type { Metadata } from "next";
import { SavedJobsClient } from "@/components/saved-jobs-client";
import { getJobs } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "收藏岗位",
};

export default async function SavedPage() {
  const jobs = await getJobs({});
  return (
    <div className="page-shell pb-12 pt-7 sm:pt-10">
      <div className="max-w-2xl">
        <p className="eyebrow">Shortlist</p>
        <h1 className="utility-title mt-5">
          收藏的机会
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
          集中查看准备投递的岗位，过期信息会保留提示。
        </p>
      </div>
      <div className="mt-8">
        <SavedJobsClient jobs={jobs} />
      </div>
    </div>
  );
}

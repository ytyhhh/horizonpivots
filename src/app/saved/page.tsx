import type { Metadata } from "next";
import { SavedJobsClient } from "@/components/saved-jobs-client";
import { getJobs } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "收藏岗位",
};

export default async function SavedPage() {
  const jobs = await getJobs({});
  return (
    <div className="page-shell py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
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

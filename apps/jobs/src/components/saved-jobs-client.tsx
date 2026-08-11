"use client";

import Link from "next/link";
import { BookmarkSimple } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui";
import { JobCard } from "@/components/job-card";
import { useSavedJobs } from "@/lib/use-saved-jobs";
import type { Job } from "@/types";

export function SavedJobsClient({ jobs }: { jobs: Job[] }) {
  const { ids: savedIds } = useSavedJobs();

  const saved = jobs.filter((job) => savedIds.includes(job.id));
  if (!saved.length) {
    return (
      <div>
        <EmptyState
          title="还没有收藏岗位"
          description="浏览岗位时点击收藏，重要机会会集中出现在这里。"
        />
        <div className="mt-5 text-center">
          <Link
            href="/jobs"
            className="button-primary !px-5"
          >
            <BookmarkSimple size={18} weight="bold" />
            去发现岗位
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {saved.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { BookmarkSimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui";
import { JobCard } from "@/components/job-card";
import { useSavedJobs } from "@/lib/use-saved-jobs";
import type { Job } from "@/types";

export function SavedJobsClient() {
  const { ids: savedIds } = useSavedJobs();
  const [result, setResult] = useState<{ key: string; jobs: Job[]; error: boolean } | null>(null);
  const idsKey = savedIds.slice(0, 100).join("\0");

  useEffect(() => {
    if (!idsKey) return;
    const controller = new AbortController();
    void fetch("/api/jobs/by-ids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: idsKey.split("\0") }),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("saved jobs unavailable");
      const payload = await response.json() as { data: Job[] };
      if (!controller.signal.aborted) setResult({ key: idsKey, jobs: payload.data, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key: idsKey, jobs: [], error: true });
    });
    return () => controller.abort();
  }, [idsKey]);

  const saved = (result?.jobs ?? []).filter((job) => savedIds.includes(job.id));
  if (savedIds.length && result?.key !== idsKey) return <p className="text-sm text-muted" role="status">正在读取收藏岗位…</p>;
  if (savedIds.length && result?.error) return <p className="text-sm text-muted" role="alert">收藏岗位暂时无法读取，请稍后刷新页面。</p>;
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

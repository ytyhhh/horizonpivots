"use client";

import { BookmarkSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useSavedJobs } from "@/lib/use-saved-jobs";

export function SaveButton({
  jobId,
  compact = false,
}: {
  jobId: string;
  compact?: boolean;
}) {
  const { ids, setIds } = useSavedJobs();
  const saved = ids.includes(jobId);

  async function toggle() {
    const next = !saved;
    const values = new Set(ids);
    if (next) values.add(jobId);
    else values.delete(jobId);
    setIds([...values]);

    try {
      await fetch(`/api/saved-jobs/${jobId}`, {
        method: next ? "POST" : "DELETE",
      });
    } catch {
      // Local persistence keeps the interaction useful while offline.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "取消收藏岗位" : "收藏岗位"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border bg-surface font-semibold text-muted hover:border-border-strong hover:text-foreground",
        compact ? "size-10" : "h-11 px-4 text-sm",
      )}
    >
      <BookmarkSimple
        size={18}
        weight={saved ? "fill" : "bold"}
        aria-hidden="true"
      />
      {!compact ? (saved ? "已收藏" : "收藏") : null}
    </button>
  );
}

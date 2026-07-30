"use client";

import { FunnelSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import { JobCard, JobDetailPanel } from "@/components/job-card";
import type { Job } from "@/types";

const types = ["全部", "秋招", "实习"] as const;

export function JobsExplorer({ jobs }: { jobs: Job[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("全部");
  const [industry, setIndustry] = useState("全部行业");
  const [location, setLocation] = useState("全部地点");
  const [selectedId, setSelectedId] = useState(jobs[0]?.id ?? "");

  const industries = useMemo(
    () => ["全部行业", ...new Set(jobs.map((job) => job.industry))],
    [jobs],
  );
  const locations = useMemo(
    () => ["全部地点", ...new Set(jobs.flatMap((job) => job.locations))],
    [jobs],
  );
  const visible = useMemo(() => {
    const normalized = query.toLocaleLowerCase().trim();
    return jobs.filter((job) => {
      const text = [
        job.company,
        job.title,
        job.summary,
        job.skills.join(" "),
        job.locations.join(" "),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return (
        (!normalized || text.includes(normalized)) &&
        (type === "全部" || job.type === type) &&
        (industry === "全部行业" || job.industry === industry) &&
        (location === "全部地点" || job.locations.includes(location))
      );
    });
  }, [industry, jobs, location, query, type]);

  const selected =
    visible.find((job) => job.id === selectedId) ?? visible[0] ?? null;
  const hasFilters =
    query || type !== "全部" || industry !== "全部行业" || location !== "全部地点";

  function reset() {
    setQuery("");
    setType("全部");
    setIndustry("全部行业");
    setLocation("全部地点");
  }

  return (
    <div>
      <section aria-label="岗位筛选" className="rounded-2xl border bg-surface p-4">
        <div className="relative">
          <MagnifyingGlass
            size={20}
            weight="bold"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <label htmlFor="job-search" className="sr-only">
            搜索公司、岗位或技能
          </label>
          <input
            id="job-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索公司、岗位或技能"
            className="h-12 w-full rounded-xl border bg-background pl-12 pr-4 text-sm text-foreground placeholder:text-subtle hover:border-border-strong focus:border-accent"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="flex rounded-xl bg-surface-muted p-1">
            {types.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  type === item
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="relative">
            <span className="sr-only">行业</span>
            <select
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              className="h-9 appearance-none rounded-xl border bg-surface px-3 pr-8 text-xs font-semibold text-muted hover:border-border-strong"
            >
              {industries.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <FunnelSimple
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
          </label>
          <label>
            <span className="sr-only">地点</span>
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="h-9 rounded-xl border bg-surface px-3 text-xs font-semibold text-muted hover:border-border-strong"
            >
              {locations.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          {hasFilters ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted hover:bg-surface-muted hover:text-foreground"
            >
              <X size={14} weight="bold" aria-hidden="true" />
              清除筛选
            </button>
          ) : null}
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between text-sm">
        <p className="text-muted">
          找到 <strong className="font-semibold text-foreground">{visible.length}</strong>{" "}
          个岗位
        </p>
        <p className="hidden text-xs text-subtle sm:block">按最新收录排序</p>
      </div>

      {visible.length ? (
        <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="grid gap-3">
            {visible.map((job) => (
              <div
                key={job.id}
                onClick={(event) => {
                  if (window.matchMedia("(min-width: 1024px)").matches) {
                    event.preventDefault();
                    setSelectedId(job.id);
                  }
                }}
              >
                <JobCard
                  job={job}
                  selected={job.id === selected?.id}
                  href={`/jobs/${job.id}`}
                />
              </div>
            ))}
          </div>
          {selected ? (
            <div className="sticky top-24 hidden lg:block">
              <JobDetailPanel job={selected} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState />
        </div>
      )}
    </div>
  );
}

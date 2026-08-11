"use client";

import { FunnelSimple, MagnifyingGlass, SpinnerGap, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import { JobCard, JobDetailPanel } from "@/components/job-card";
import type { Job } from "@/types";

const types = ["全部", "秋招", "春招", "实习"] as const;

interface JobsExplorerProps {
  initialJobs: Job[];
  initialCursor: string | null;
  initialTotal: number;
  initialIndustry: string;
  initialCuhkShenzhenOnly: boolean;
  canFilterCuhkShenzhen: boolean;
}

export function JobsExplorer({
  initialJobs,
  initialCursor,
  initialTotal,
  initialIndustry,
  initialCuhkShenzhenOnly,
  canFilterCuhkShenzhen,
}: JobsExplorerProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [total, setTotal] = useState(initialTotal);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("全部");
  const [industry, setIndustry] = useState(initialIndustry);
  const [location, setLocation] = useState("全部地点");
  const [cuhkShenzhenOnly, setCuhkShenzhenOnly] = useState(initialCuhkShenzhenOnly);
  const [selectedId, setSelectedId] = useState(jobs[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const industries = useMemo(
    () => ["全部行业", ...new Set(jobs.map((job) => job.industry))],
    [jobs],
  );
  const locations = useMemo(
    () => ["全部地点", ...new Set(jobs.flatMap((job) => job.locations))],
    [jobs],
  );
  const filters = useMemo(
    () => ({
      query,
      type: type === "全部" ? "" : type,
      industry: industry === "全部行业" ? "" : industry,
      location: location === "全部地点" ? "" : location,
      cuhkShenzhenOnly: cuhkShenzhenOnly ? "true" : "",
    }),
    [cuhkShenzhenOnly, industry, location, query, type],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "50" });
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.set(key, value);
        });
        const response = await fetch(`/api/jobs?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("请求失败");
        const page = (await response.json()) as {
          data: Job[];
          nextCursor: string | null;
          total: number;
        };
        setJobs(page.data);
        setNextCursor(page.nextCursor);
        setTotal(page.total);
        setSelectedId(page.data[0]?.id ?? "");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setJobs([]);
          setTotal(0);
          setNextCursor(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [filters, query]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "50", cursor: nextCursor });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const response = await fetch(`/api/jobs?${params}`);
      if (!response.ok) throw new Error("请求失败");
      const page = (await response.json()) as {
        data: Job[];
        nextCursor: string | null;
        total: number;
      };
      setJobs((current) => [...current, ...page.data]);
      setNextCursor(page.nextCursor);
      setTotal(page.total);
    } finally {
      setLoadingMore(false);
    }
  }

  const selected = jobs.find((job) => job.id === selectedId) ?? jobs[0] ?? null;
  const hasFilters =
    query ||
    type !== "全部" ||
    industry !== "全部行业" ||
    location !== "全部地点" ||
    cuhkShenzhenOnly;

  const activeFilters = [
    query ? { label: `关键词：${query}`, clear: () => setQuery("") } : null,
    type !== "全部" ? { label: type, clear: () => setType("全部") } : null,
    industry !== "全部行业"
      ? { label: industry, clear: () => setIndustry("全部行业") }
      : null,
    location !== "全部地点"
      ? { label: location, clear: () => setLocation("全部地点") }
      : null,
    cuhkShenzhenOnly
      ? { label: "港中深专属", clear: () => setCuhkShenzhenOnly(false) }
      : null,
  ].filter((item): item is { label: string; clear: () => void } => Boolean(item));

  function reset() {
    setQuery("");
    setType("全部");
    setIndustry("全部行业");
    setLocation("全部地点");
    setCuhkShenzhenOnly(false);
  }

  return (
    <div>
      <section aria-label="岗位筛选" className="sticky top-[4.75rem] z-20 rounded-[1.15rem] border border-border/75 bg-surface/94 p-3 shadow-[0_12px_40px_rgba(20,35,24,.07)] backdrop-blur-xl sm:p-4">
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
            className="h-11 w-full rounded-[0.85rem] border border-border/75 bg-background pl-11 pr-4 text-sm text-foreground placeholder:text-subtle hover:border-border-strong focus:border-accent"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="flex rounded-[0.8rem] bg-surface-muted p-1">
            {types.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={`rounded-[0.6rem] px-3 py-1.5 text-xs font-semibold ${
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
              className="filter-control h-9 appearance-none px-3 pr-8"
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
              className="filter-control h-9 px-3"
            >
              {locations.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          {canFilterCuhkShenzhen ? (
            <button
              type="button"
              onClick={() => setCuhkShenzhenOnly((current) => !current)}
              aria-pressed={cuhkShenzhenOnly}
              className={`h-9 rounded-[0.8rem] border px-3 text-xs font-semibold transition-colors ${
                cuhkShenzhenOnly
                  ? "border-accent bg-accent text-white"
                  : "bg-surface text-muted hover:border-border-strong hover:text-foreground"
              }`}
            >
              港中深专属
            </button>
          ) : null}
          {hasFilters ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center gap-1.5 rounded-[0.8rem] px-3 text-xs font-semibold text-muted hover:bg-surface-muted hover:text-foreground"
            >
              <X size={14} weight="bold" aria-hidden="true" />
              清除筛选
            </button>
          ) : null}
        </div>
        {activeFilters.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
            <span className="mr-1 text-[10px] font-medium text-subtle">已选择</span>
            {activeFilters.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.clear}
                className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-[10px] font-semibold text-accent hover:bg-surface-strong"
              >
                {item.label}
                <X size={11} weight="bold" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <div className="mt-5 flex items-center justify-between text-sm">
        <p className="text-xs text-muted sm:text-sm">
          找到 <strong className="font-semibold text-foreground">{total}</strong> 个岗位
        </p>
        <p className="hidden text-xs text-subtle sm:block">按最新收录排序</p>
      </div>

      {jobs.length ? (
        <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]">
          <div className="grid gap-3">
            {jobs.map((job) => (
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
            <div className="sticky top-[10.6rem] hidden lg:block">
              <JobDetailPanel job={selected} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState />
        </div>
      )}
      {nextCursor ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="button-secondary !min-h-11 !px-5 disabled:opacity-55"
          >
            {loadingMore ? <SpinnerGap size={18} className="animate-spin" /> : null}
            {loadingMore ? "正在加载" : `加载更多（已显示 ${jobs.length} / ${total}）`}
          </button>
        </div>
      ) : null}
      {loading ? <p className="mt-4 text-center text-sm text-muted">正在更新岗位列表…</p> : null}
    </div>
  );
}

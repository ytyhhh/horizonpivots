import Link from "next/link";
import {
  ArrowUpRight,
  Buildings,
  CalendarBlank,
  MapPin,
  SealCheck,
} from "@phosphor-icons/react/dist/ssr";
import { SaveButton } from "@/components/save-button";
import { cn, daysUntil, formatDate } from "@/lib/utils";
import type { Job } from "@/types";

function Deadline({ value }: { value?: string | null }) {
  const days = daysUntil(value, new Date("2026-07-30T12:00:00+08:00"));
  const urgent = days !== null && days >= 0 && days <= 14;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        urgent ? "text-warning" : "text-muted",
      )}
    >
      <CalendarBlank size={15} weight="bold" aria-hidden="true" />
      {urgent ? `${days} 天后截止` : formatDate(value)}
    </span>
  );
}

export function JobCard({
  job,
  selected = false,
  href,
}: {
  job: Job;
  selected?: boolean;
  href?: string;
}) {
  return (
    <article
      className={cn(
        "group relative rounded-2xl border bg-surface p-5",
        selected
          ? "border-accent shadow-[0_0_0_1px_var(--accent)]"
          : "hover:border-border-strong",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-muted text-accent">
          <Buildings size={22} weight="duotone" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted">{job.company}</p>
              <h3 className="mt-1 text-lg font-semibold tracking-[-0.025em]">
                <Link
                  href={href ?? `/jobs/${job.id}`}
                  className="before:absolute before:inset-0 before:rounded-2xl"
                >
                  {job.title}
                </Link>
              </h3>
            </div>
            <ArrowUpRight
              size={18}
              weight="bold"
              className="shrink-0 text-subtle group-hover:text-accent"
              aria-hidden="true"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <MapPin size={15} weight="bold" aria-hidden="true" />
              {job.locations.slice(0, 3).join(" / ") || "地点待确认"}
            </span>
            <Deadline value={job.deadline} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {job.cuhkShenzhenOnly ? (
          <span className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white">
            港中深专属
          </span>
        ) : null}
        <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
          {job.type}
        </span>
        <span className="rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">
          {job.industry}
        </span>
        <span className="rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">
          {job.cohort}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <SealCheck size={15} weight="fill" className="text-accent" aria-hidden="true" />
          {job.sourceConfidence}
        </span>
        <span>收录于 {formatDate(job.firstSeen)}</span>
      </div>
    </article>
  );
}

export function JobDetailPanel({ job }: { job: Job }) {
  return (
    <article className="rounded-2xl border bg-surface p-6 card-shadow lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-medium text-accent">{job.company}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] lg:text-3xl">
            {job.title}
          </h2>
          <p className="mt-3 text-sm text-muted">
            {job.batch} / {job.cohort} / {job.industry}
          </p>
          {job.cuhkShenzhenOnly ? (
            <p className="mt-3 inline-flex rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white">
              港中深学生专属
            </p>
          ) : null}
        </div>
        <SaveButton jobId={job.id} compact />
      </div>

      <p className="mt-7 text-[15px] leading-7 text-muted">{job.summary}</p>

      <dl className="mt-7 grid gap-5 rounded-2xl bg-surface-muted p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-subtle">工作地点</dt>
          <dd className="mt-1.5 text-sm font-semibold">
            {job.locations.join("、") || "待确认"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-subtle">申请截止</dt>
          <dd className="mt-1.5 text-sm font-semibold">{formatDate(job.deadline)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-subtle">信息来源</dt>
          <dd className="mt-1.5 text-sm font-semibold">
            {job.sourceName} / {job.sourceConfidence}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-subtle">最近核验</dt>
          <dd className="mt-1.5 text-sm font-semibold">{formatDate(job.lastSeen)}</dd>
        </div>
      </dl>

      <div className="mt-7">
        <h3 className="text-sm font-semibold">相关能力</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {job.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-lg border bg-surface px-3 py-1.5 text-xs font-medium text-muted"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {job.applyUrl ? (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="tactile inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            前往申请
            <ArrowUpRight size={17} weight="bold" aria-hidden="true" />
          </a>
        ) : (
          <span className="inline-flex h-11 items-center justify-center rounded-xl bg-surface-muted px-5 text-sm font-medium text-muted">
            申请入口待核验
          </span>
        )}
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold text-muted hover:border-border-strong hover:text-foreground"
        >
          查看信息源
        </a>
      </div>
      <p className="mt-4 text-xs leading-5 text-subtle">
        岗位状态、要求和截止时间可能发生变化，请以招聘方页面为准。
      </p>
    </article>
  );
}

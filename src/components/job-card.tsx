import Link from "next/link";
import {
  ArrowRight,
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
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", urgent ? "text-warning" : "text-muted")}>
      <CalendarBlank size={14} weight="regular" aria-hidden="true" />
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
        "group relative overflow-hidden rounded-[1.15rem] bg-background p-4 transition-[background-color,box-shadow,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] sm:p-5",
        selected
          ? "bg-accent-soft shadow-[inset_3px_0_0_var(--accent)]"
          : "hover:-translate-y-0.5 hover:bg-surface-muted",
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="grid size-10 shrink-0 place-items-center rounded-[0.8rem] bg-surface text-accent ring-1 ring-border/55">
          <Buildings size={20} weight="duotone" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted">{job.company}</p>
              <h3 className="mt-1 truncate text-base font-semibold tracking-[-0.025em] sm:text-[1.05rem]">
                <Link href={href ?? `/jobs/${job.id}`} className="before:absolute before:inset-0">
                  {job.title}
                </Link>
              </h3>
            </div>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-subtle transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent">
              <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <MapPin size={14} weight="regular" aria-hidden="true" />
              {job.locations.slice(0, 3).join(" / ") || "地点待确认"}
            </span>
            <Deadline value={job.deadline} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 pl-0 sm:pl-[3.35rem]">
        {job.cuhkShenzhenOnly ? (
          <span className="rounded-md bg-accent px-2 py-1 text-[10px] font-semibold text-white">港中深专属</span>
        ) : null}
        <span className="rounded-md bg-accent-soft px-2 py-1 text-[10px] font-semibold text-accent">{job.type}</span>
        <span className="rounded-md bg-surface px-2 py-1 text-[10px] font-medium text-muted">{job.industry}</span>
        <span className="rounded-md bg-surface px-2 py-1 text-[10px] font-medium text-muted">{job.cohort}</span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-subtle sm:ml-[3.35rem]">
        <span className="inline-flex items-center gap-1.5">
          <SealCheck size={13} weight="fill" className="text-accent" aria-hidden="true" />
          {job.sourceConfidence}
        </span>
        <span>收录于 {formatDate(job.firstSeen)}</span>
      </div>
    </article>
  );
}

export function JobDetailPanel({ job }: { job: Job }) {
  return (
    <article className="panel-shell soft-shadow">
      <div className="panel-core p-5 sm:p-7 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-accent">{job.company}</p>
              {job.cuhkShenzhenOnly ? (
                <span className="rounded-md bg-accent px-2 py-1 text-[10px] font-semibold text-white">港中深学生专属</span>
              ) : null}
            </div>
            <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.045em] lg:text-3xl">
              {job.title}
            </h2>
            <p className="mt-3 text-xs text-muted">{job.batch} / {job.cohort} / {job.industry}</p>
          </div>
          <SaveButton jobId={job.id} compact />
        </div>

        <p className="text-pretty mt-7 text-[15px] leading-7 text-muted">{job.summary}</p>

        <dl className="mt-7 grid gap-px overflow-hidden rounded-[1rem] bg-border/70 sm:grid-cols-2">
          {[
            ["工作地点", job.locations.join("、") || "待确认"],
            ["申请截止", formatDate(job.deadline)],
            ["信息来源", `${job.sourceName} / ${job.sourceConfidence}`],
            ["最近核验", formatDate(job.lastSeen)],
          ].map(([label, value]) => (
            <div key={label} className="bg-surface-muted p-4">
              <dt className="text-[10px] font-medium tracking-[0.08em] text-subtle">{label}</dt>
              <dd className="mt-1.5 text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        {job.description ? (
          <section className="mt-8 border-t border-border/70 pt-7">
            <p className="eyebrow">岗位描述</p>
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-muted">{job.description}</p>
          </section>
        ) : null}

        {job.skills.length ? (
          <section className="mt-8 border-t border-border/70 pt-7">
            <h3 className="text-sm font-semibold">相关能力</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <span key={skill} className="rounded-md bg-surface-muted px-3 py-1.5 text-xs font-medium text-muted">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-8 hidden flex-col gap-3 sm:flex-row lg:flex">
          {job.applyUrl ? (
            <a href={job.applyUrl} target="_blank" rel="noreferrer" className="button-primary group">
              前往申请
              <span className="button-orb"><ArrowUpRight size={16} weight="bold" aria-hidden="true" /></span>
            </a>
          ) : (
            <span className="inline-flex h-12 items-center justify-center rounded-full bg-surface-muted px-5 text-sm font-medium text-muted">申请入口待核验</span>
          )}
          <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="button-secondary group">
            查看信息源
            <span className="button-orb"><ArrowRight size={15} weight="bold" aria-hidden="true" /></span>
          </a>
        </div>
        <p className="mt-5 text-xs leading-5 text-subtle">岗位状态、要求和截止时间可能发生变化，请以招聘方页面为准。</p>
      </div>

      <div className="fixed inset-x-3 bottom-[5.15rem] z-20 flex gap-2 rounded-[1.1rem] border border-border/75 bg-surface/94 p-2 shadow-[0_18px_50px_rgba(0,0,0,.16)] backdrop-blur-xl lg:hidden">
        {job.applyUrl ? (
          <a href={job.applyUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[0.85rem] bg-accent px-4 text-sm font-semibold text-white">
            前往申请 <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
          </a>
        ) : (
          <span className="inline-flex h-11 flex-1 items-center justify-center rounded-[0.85rem] bg-surface-muted px-4 text-sm text-muted">入口待核验</span>
        )}
        <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-border/75 px-4 text-sm font-semibold text-muted">
          信息源
        </a>
      </div>
    </article>
  );
}

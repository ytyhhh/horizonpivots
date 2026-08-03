import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle,
  Lightbulb,
  MapPin,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { Recommendation } from "@/types";
import { cn } from "@/lib/utils";

const tierStyles = {
  高匹配: "bg-accent-soft text-accent",
  值得尝试: "bg-warning-soft text-warning",
  拓展机会: "bg-surface-muted text-muted",
};

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { job, tier, matches, gaps, explanation } = recommendation;
  return (
    <article className="group relative overflow-hidden rounded-[1.25rem] bg-background p-5 transition-[background-color,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1 hover:bg-surface-muted sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className={cn("inline-flex rounded-md px-2 py-1 text-[10px] font-semibold", tierStyles[tier])}>
            {tier}
          </span>
          <p className="mt-5 text-xs font-medium text-muted">{job.company}</p>
          <h3 className="mt-1 text-xl font-semibold leading-tight tracking-[-0.035em]">{job.title}</h3>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted">
            <MapPin size={14} weight="regular" aria-hidden="true" />
            {job.locations.join(" / ") || "地点待确认"}
          </p>
        </div>
        <Link
          href={`/jobs/${job.id}`}
          aria-label={`查看 ${job.company} ${job.title}`}
          className="grid size-10 place-items-center rounded-full bg-surface text-muted ring-1 ring-border/60 group-hover:text-accent"
        >
          <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 flex gap-3 border-l-2 border-accent/45 pl-4">
        <Lightbulb size={18} weight="duotone" className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-sm leading-6 text-muted">{explanation}</p>
      </div>

      <div className="mt-6 grid gap-px overflow-hidden rounded-[0.9rem] bg-border/65 sm:grid-cols-2">
        <div className="bg-surface p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold">
            <CheckCircle size={15} weight="fill" className="text-accent" aria-hidden="true" />
            已有匹配
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(matches.length ? matches : ["可迁移经历"]).map((item) => (
              <span key={item} className="rounded-md bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent">{item}</span>
            ))}
          </div>
        </div>
        <div className="bg-surface p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold">
            <WarningCircle size={15} weight="fill" className="text-warning" aria-hidden="true" />
            投递前补充
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(gaps.length ? gaps : ["岗位定制说明"]).map((item) => (
              <span key={item} className="rounded-md bg-warning-soft px-2 py-1 text-[10px] font-medium text-warning">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

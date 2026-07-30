import Link from "next/link";
import {
  ArrowRight,
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

export function RecommendationCard({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  const { job, tier, matches, gaps, explanation } = recommendation;
  return (
    <article className="rounded-2xl border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span
            className={cn(
              "inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold",
              tierStyles[tier],
            )}
          >
            {tier}
          </span>
          <p className="mt-4 text-sm font-medium text-muted">{job.company}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
            {job.title}
          </h3>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
            <MapPin size={15} weight="bold" aria-hidden="true" />
            {job.locations.join(" / ") || "地点待确认"}
          </p>
        </div>
        <Link
          href={`/jobs/${job.id}`}
          aria-label={`查看 ${job.company} ${job.title}`}
          className="grid size-10 place-items-center rounded-xl border text-muted hover:border-border-strong hover:text-foreground"
        >
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 rounded-2xl bg-surface-muted p-4">
        <div className="flex gap-2">
          <Lightbulb
            size={19}
            weight="duotone"
            className="mt-0.5 shrink-0 text-accent"
            aria-hidden="true"
          />
          <p className="text-sm leading-6 text-muted">{explanation}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <CheckCircle
              size={16}
              weight="fill"
              className="text-accent"
              aria-hidden="true"
            />
            已有匹配
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(matches.length ? matches : ["可迁移经历"]).map((item) => (
              <span
                key={item}
                className="rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <WarningCircle
              size={16}
              weight="fill"
              className="text-warning"
              aria-hidden="true"
            />
            投递前补充
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(gaps.length ? gaps : ["岗位定制说明"]).map((item) => (
              <span
                key={item}
                className="rounded-lg bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

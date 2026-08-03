import type { ReactNode } from "react";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="section-title">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}

export function ArrowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full text-sm font-semibold text-accent hover:text-accent-strong",
        className,
      )}
    >
      {children}
      <span className="grid size-8 place-items-center rounded-full bg-accent-soft">
        <ArrowRight
          size={14}
          weight="bold"
          className="transition-transform duration-500 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </a>
  );
}

export function EmptyState({
  title = "暂时没有匹配结果",
  description = "换一个关键词或放宽筛选条件再试试。",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="panel-shell">
      <div className="panel-core grid min-h-72 place-items-center p-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-muted text-muted">
          <MagnifyingGlass size={24} weight="duotone" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
      </div>
      </div>
    </div>
  );
}

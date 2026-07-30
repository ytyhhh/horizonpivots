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
    <div className="mb-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-balance text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
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
        "inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-accent hover:text-accent-strong",
        className,
      )}
    >
      {children}
      <ArrowRight size={16} weight="bold" aria-hidden="true" />
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
    <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed bg-surface p-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-muted text-muted">
          <MagnifyingGlass size={24} weight="duotone" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
  );
}

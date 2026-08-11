"use client";

import { Check } from "@phosphor-icons/react";

const steps = [
  { id: "schools", zh: "选择学校", en: "Choose schools" },
  { id: "research", zh: "研究方向", en: "Research focus" },
  { id: "review", zh: "确认搜索", en: "Review" },
] as const;

export function StepRail({ current, locale }: { current: string; locale: "zh" | "en" }) {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === current));
  return (
    <ol className="flex items-center gap-2 overflow-x-auto p-0" aria-label={locale === "zh" ? "搜索步骤" : "Search steps"}>
      {steps.map((step, index) => {
        const complete = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${active || complete ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--faint)]"}`}>
              {complete ? <Check size={14} weight="bold" /> : index + 1}
            </span>
            <span className={`whitespace-nowrap text-sm ${active ? "font-semibold text-[var(--ink)]" : "text-[var(--faint)]"}`}>{locale === "zh" ? step.zh : step.en}</span>
            {index < steps.length - 1 && <span className="mx-1 h-px w-6 bg-[var(--line)] md:w-14" />}
          </li>
        );
      })}
    </ol>
  );
}

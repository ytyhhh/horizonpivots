"use client";

import { ArrowLeft, CheckCircle, Database, Globe, WarningCircle } from "@phosphor-icons/react";
import type { SearchJob } from "@/lib/types";

const stageText = {
  queued: { zh: "准备检索任务", en: "Preparing search" },
  discovering: { zh: "分析论文与作者关系", en: "Analyzing papers and authors" },
  verifying: { zh: "核验学校官方页面", en: "Verifying official pages" },
  ranking: { zh: "生成匹配解释与排序", en: "Ranking research fit" },
  complete: { zh: "检索完成", en: "Search complete" },
};

export function SearchProgress({ locale, job, error, onBack }: { locale: "zh" | "en"; job: SearchJob | null; error?: string; onBack: () => void }) {
  return (
    <section className="mx-auto grid max-w-4xl gap-7 py-4 md:py-10">
      <div className="max-w-2xl">
        <h1 className="m-0 text-3xl font-semibold tracking-[-0.035em] md:text-[42px] md:leading-[1.08]">{error ? (locale === "zh" ? "检索遇到问题" : "Search needs attention") : (locale === "zh" ? "正在学校范围内寻找导师" : "Searching within your selected schools")}</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">{error || (job ? stageText[job.stage][locale] : (locale === "zh" ? "正在创建任务" : "Creating search job"))}</p>
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-[var(--line)] p-5 md:p-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-[12px] bg-[var(--accent-soft)] text-[var(--accent)]">{error ? <WarningCircle size={23} /> : <Globe size={23} />}</span><div><p className="m-0 font-semibold">{job ? stageText[job.stage][locale] : stageText.queued[locale]}</p><p className="m-0 mt-1 text-sm text-[var(--faint)]">{job ? `${job.progress}%` : "0%"}</p></div></div>
            {!error && <Database size={22} className="text-[var(--faint)]" />}
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface-raised)]" aria-label="Search progress"><div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${job?.progress ?? 4}%` }} /></div>
        </div>

        <div className="grid md:grid-cols-2">
          {(job?.schools ?? []).map((school) => (
            <div key={school.institutionId} className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--line)] p-4 md:[&:nth-child(odd)]:border-r">
              <div><p className="m-0 truncate text-sm font-semibold">{school.institutionName}</p><p className="m-0 mt-1 text-xs text-[var(--faint)]">{school.status === "failed" ? school.error : locale === "zh" ? `发现 ${school.discovered} 位候选，官网核验 ${school.verified} 位` : `${school.discovered} found, ${school.verified} officially verified`}</p></div>
              {school.status === "complete" ? <CheckCircle size={19} weight="fill" className="text-[var(--accent)]" /> : school.status === "failed" ? <WarningCircle size={19} className="text-[var(--danger)]" /> : <span className="text-xs font-semibold text-[var(--accent)]">{locale === "zh" ? "进行中" : "Working"}</span>}
            </div>
          ))}
          {!job && Array.from({ length: 4 }).map((_, index) => <div key={index} className="border-b border-[var(--line)] p-4 md:[&:nth-child(odd)]:border-r"><div className="skeleton h-4 w-2/3" /><div className="skeleton mt-3 h-3 w-1/2" /></div>)}
        </div>
      </div>

      <div><button className="button-secondary" onClick={onBack}><ArrowLeft size={18} />{locale === "zh" ? "返回修改" : "Back to edit"}</button></div>
    </section>
  );
}

"use client";

import { ArrowRight, Buildings, Check, MagnifyingGlass, MapPin, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { INSTITUTIONS, REGIONS } from "@/data/institutions";
import type { Institution, RegionCode } from "@/lib/types";

export function SchoolStep({
  locale,
  selectedIds,
  onChange,
  onNext,
}: {
  locale: "zh" | "en";
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<RegionCode | "ALL">("ALL");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return INSTITUTIONS.filter((institution) => {
      const regionMatch = region === "ALL" || institution.region === region;
      const text = `${institution.name} ${institution.nameZh} ${institution.shortName} ${institution.city}`.toLowerCase();
      return regionMatch && (!normalized || text.includes(normalized));
    });
  }, [query, region]);

  const toggleSchool = (institution: Institution) => {
    if (selectedIds.includes(institution.id)) {
      onChange(selectedIds.filter((id) => id !== institution.id));
      return;
    }
    if (selectedIds.length < 10) onChange([...selectedIds, institution.id]);
  };

  const selected = INSTITUTIONS.filter((institution) => selectedIds.includes(institution.id));

  return (
    <section className="grid gap-7">
      <div className="max-w-2xl">
        <h1 className="m-0 text-3xl font-semibold tracking-[-0.035em] md:text-[42px] md:leading-[1.08]">
          {locale === "zh" ? "先确定学校，再寻找真正相关的导师" : "Choose schools first, then find the right supervisors"}
        </h1>
        <p className="mt-4 max-w-[62ch] text-base leading-7 text-[var(--muted)]">
          {locale === "zh" ? "选择 1-10 所目标学校。系统只在这些学校的学术记录和官方网站内搜索。" : "Select 1-10 target schools. Search stays inside their academic records and official websites."}
        </p>
      </div>

      <div className="surface overflow-hidden">
        <div className="grid gap-4 border-b border-[var(--line)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:p-5">
          <label className="relative block">
            <span className="sr-only">{locale === "zh" ? "搜索学校" : "Search schools"}</span>
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]" size={19} />
            <input className="field !pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "zh" ? "搜索学校中文名、英文名或简称" : "Search by school name or abbreviation"} />
          </label>
          <div className="flex gap-2 overflow-x-auto">
            {REGIONS.map((item) => (
              <button key={item.code} type="button" className={`button-quiet !min-h-10 !px-3 ${region === item.code ? "bg-[var(--accent-soft)] !text-[var(--accent)]" : ""}`} onClick={() => setRegion(item.code)}>
                {locale === "zh" ? item.zh : item.en}
              </button>
            ))}
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--surface-raised)] p-4">
            <span className="mr-1 text-sm font-semibold">{locale === "zh" ? `已选 ${selected.length}/10` : `${selected.length}/10 selected`}</span>
            {selected.map((institution) => (
              <button key={institution.id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium" onClick={() => toggleSchool(institution)}>
                {institution.shortName}<X size={13} />
              </button>
            ))}
          </div>
        )}

        <div className="grid max-h-[430px] overflow-y-auto md:grid-cols-2">
          {filtered.map((institution) => {
            const active = selectedIds.includes(institution.id);
            const disabled = !active && selectedIds.length >= 10;
            return (
              <button key={institution.id} type="button" disabled={disabled} onClick={() => toggleSchool(institution)} className={`group grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-[var(--line)] p-4 text-left transition-colors last:border-b-0 md:[&:nth-child(odd)]:border-r ${active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-raised)]"} disabled:cursor-not-allowed disabled:opacity-45`}>
                <span className={`grid size-11 place-items-center rounded-[12px] border text-sm font-bold ${active ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"}`}>
                  {institution.shortName.slice(0, 3)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--ink)]">{locale === "zh" ? institution.nameZh : institution.name}</span>
                  <span className="mt-1 flex items-center gap-1 truncate text-xs text-[var(--faint)]"><MapPin size={13} />{institution.city}<span className="px-1">/</span>{institution.domain}</span>
                </span>
                <span className={`grid size-7 place-items-center rounded-full border ${active ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--page)]" : "border-[var(--line-strong)] text-transparent"}`}><Check size={14} weight="bold" /></span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full grid min-h-56 place-items-center p-8 text-center">
              <div><Buildings className="mx-auto text-[var(--faint)]" size={32} /><p className="mb-0 mt-3 font-medium">{locale === "zh" ? "没有找到匹配学校" : "No matching schools"}</p><p className="mt-1 text-sm text-[var(--faint)]">{locale === "zh" ? "尝试其他名称或地区。" : "Try another name or region."}</p></div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="button-primary min-w-32" disabled={selectedIds.length === 0} onClick={onNext}>
          {locale === "zh" ? "填写研究方向" : "Research focus"}<ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

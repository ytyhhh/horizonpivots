"use client";

import { ArrowLeft, Buildings, CheckCircle, Flask, MagnifyingGlass } from "@phosphor-icons/react";
import { INSTITUTIONS } from "@/data/institutions";
import type { ResearchFormState } from "@/components/research-step";

export function ReviewStep({
  locale,
  selectedIds,
  form,
  loading,
  searchEnabled,
  onBack,
  onStart,
}: {
  locale: "zh" | "en";
  selectedIds: string[];
  form: ResearchFormState;
  loading: boolean;
  searchEnabled: boolean;
  onBack: () => void;
  onStart: () => void;
}) {
  const schools = INSTITUTIONS.filter((school) => selectedIds.includes(school.id));
  const keywords = form.keywords.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  return (
    <section className="grid gap-7">
      <div className="max-w-2xl">
        <h1 className="m-0 text-3xl font-semibold tracking-[-0.035em] md:text-[42px] md:leading-[1.08]">{locale === "zh" ? (searchEnabled ? "确认范围，然后开始检索" : "导师检索即将开放") : (searchEnabled ? "Confirm the scope, then start searching" : "Faculty search is coming soon")}</h1>
        <p className="mt-4 max-w-[62ch] text-base leading-7 text-[var(--muted)]">{locale === "zh" ? (searchEnabled ? "检索会并行分析所选学校，并实时更新学校级发现与官网核验进度。" : "你可以先浏览院校信息、保存研究准备材料。导师发现与匹配功能正在完善中。") : (searchEnabled ? "Selected schools are processed in parallel with live school-level discovery and verification progress." : "Browse institutions and prepare your research details while faculty discovery and matching are being prepared.")}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="surface p-5 md:p-7">
          <div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-[12px] bg-[var(--accent-soft)] text-[var(--accent)]"><Buildings size={21} /></span><div><h2 className="m-0 text-lg font-semibold">{locale === "zh" ? `${schools.length} 所目标学校` : `${schools.length} target schools`}</h2><p className="m-0 mt-1 text-sm text-[var(--faint)]">{locale === "zh" ? "只搜索这些学校及其合法子域名" : "Search is limited to these schools and valid subdomains"}</p></div></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {schools.map((school) => <div key={school.id} className="flex items-center gap-3 rounded-[12px] bg-[var(--surface-raised)] p-3"><span className="grid size-9 place-items-center rounded-[10px] border border-[var(--line)] bg-[var(--surface)] text-xs font-bold">{school.shortName.slice(0, 3)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{locale === "zh" ? school.nameZh : school.name}</span><span className="block truncate text-xs text-[var(--faint)]">{school.domain}</span></span></div>)}
          </div>
        </div>

        <div className="surface p-5 md:p-7">
          <div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-[12px] bg-[var(--accent-soft)] text-[var(--accent)]"><Flask size={21} /></span><div><h2 className="m-0 text-lg font-semibold">{form.doctoralField}</h2><p className="m-0 mt-1 text-sm text-[var(--faint)]">{locale === "zh" ? "研究匹配优先" : "Research fit first"}</p></div></div>
          <p className="m-0 line-clamp-4 text-sm leading-6 text-[var(--muted)]">{form.researchDescription}</p>
          <div className="mt-4 flex flex-wrap gap-2">{keywords.map((keyword) => <span key={keyword} className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent)]">{keyword}</span>)}</div>
        </div>
      </div>

      <div className="surface grid gap-4 p-5 md:grid-cols-[auto_1fr] md:items-start md:p-6">
        <CheckCircle size={24} weight="fill" className="text-[var(--accent)]" />
        <div className="grid gap-2 text-sm leading-6 text-[var(--muted)]">
          <p className="m-0 font-semibold text-[var(--ink)]">{locale === "zh" ? (searchEnabled ? "结果如何生成" : "当前可用功能") : (searchEnabled ? "How results are produced" : "Available now")}</p>
          <p className="m-0">{locale === "zh" ? (searchEnabled ? "OpenAlex 负责发现候选及近期论文，Semantic Scholar 可补充论文摘要。Brave Search 在配置密钥后查找学校官方页面。硅基流动只根据提供的证据生成匹配解释，不会补造招生信息。" : "院校浏览、统一账号和研究信息准备已经可用。导师发现、官网核验与匹配排序将在后续版本开放。") : (searchEnabled ? "OpenAlex discovers candidates and recent work, while Semantic Scholar can enrich paper abstracts. Brave Search finds official school pages when configured. SiliconFlow explains fit from supplied evidence and never invents recruiting claims." : "Institution browsing, unified accounts, and research preparation are available now. Faculty discovery, verification, and ranking will launch in a later release.")}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button className="button-secondary" disabled={loading} onClick={onBack}><ArrowLeft size={18} />{locale === "zh" ? "修改条件" : "Edit"}</button>
        <button className="button-primary min-w-36" disabled={loading || !searchEnabled} onClick={onStart}><MagnifyingGlass size={18} />{searchEnabled ? (loading ? (locale === "zh" ? "正在创建任务" : "Starting") : (locale === "zh" ? "开始寻找导师" : "Find supervisors")) : (locale === "zh" ? "即将开放" : "Coming soon")}</button>
      </div>
    </section>
  );
}

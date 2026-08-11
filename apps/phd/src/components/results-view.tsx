"use client";

import { Dialog } from "@radix-ui/themes";
import { ArrowSquareOut, BookmarkSimple, Check, Copy, EnvelopeSimple, FileText, Flask, MagnifyingGlass, ShieldCheck, WarningCircle, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { getInstitution } from "@/data/institutions";
import type { ApplicantProfile, EmailDraft, FacultyRecommendation, SearchJob, ShortlistStatus } from "@/lib/types";

const statusLabel = {
  accepting: { zh: "官网明确招生", en: "Officially recruiting" },
  possibly_accepting: { zh: "可能招生", en: "Possibly recruiting" },
  unknown: { zh: "招生状态未知", en: "Recruiting unknown" },
  not_accepting: { zh: "官网明确不招生", en: "Not recruiting" },
};

const shortlistLabel: Record<ShortlistStatus, { zh: string; en: string }> = {
  saved: { zh: "已收藏", en: "Saved" },
  preparing: { zh: "准备联系", en: "Preparing" },
  contacted: { zh: "已联系", en: "Contacted" },
  replied: { zh: "已回复", en: "Replied" },
  closed: { zh: "已结束", en: "Closed" },
};

export function ResultsView({
  locale,
  job,
  profile,
  onNewSearch,
}: {
  locale: "zh" | "en";
  job: SearchJob;
  profile: ApplicantProfile;
  onNewSearch: () => void;
}) {
  const [schoolFilter, setSchoolFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState(job.results[0]?.id ?? "");
  const [shortlist, setShortlist] = useState<Record<string, ShortlistStatus>>({});
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("phd-scope-shortlist");
    if (saved) queueMicrotask(() => setShortlist(JSON.parse(saved)));
  }, []);

  const filtered = useMemo(() => schoolFilter === "ALL" ? job.results : job.results.filter((item) => item.institutionId === schoolFilter), [job.results, schoolFilter]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];

  const updateShortlist = async (facultyId: string, status: ShortlistStatus) => {
    const next = { ...shortlist, [facultyId]: status };
    setShortlist(next);
    window.localStorage.setItem("phd-scope-shortlist", JSON.stringify(next));
    const facultySnapshot = job.results.find((item) => item.id === facultyId);
    await fetch("/api/shortlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facultyId, status, facultySnapshot }) }).catch(() => undefined);
  };

  const generateDraft = async (faculty: FacultyRecommendation) => {
    setDraftLoading(true);
    setDraft(null);
    try {
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyId: faculty.id,
          faculty: {
            name: faculty.name,
            title: faculty.title,
            institutionName: faculty.institutionName,
            researchSummary: faculty.researchSummary,
            publications: faculty.publications.map(({ title, year }) => ({ title, year })),
          },
          profile,
          doctoralField: job.query.doctoralField,
          researchDescription: job.query.researchDescription,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Draft failed");
      setDraft(payload.data);
      await updateShortlist(faculty.id, "preparing");
    } catch {
      setDraft(null);
    } finally {
      setDraftLoading(false);
    }
  };

  const copyDraft = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const schoolIds = Array.from(new Set(job.results.map((item) => item.institutionId)));

  return (
    <section className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><h1 className="m-0 text-3xl font-semibold tracking-[-0.035em] md:text-[40px]">{locale === "zh" ? "导师匹配结果" : "Supervisor matches"}</h1><p className="mb-0 mt-3 text-sm leading-6 text-[var(--muted)]">{locale === "zh" ? `从 ${job.schools.length} 所学校中找到 ${job.results.length} 位候选。研究契合度优先，学校排名不计分。` : `${job.results.length} candidates across ${job.schools.length} schools. Ranked by research fit, not school prestige.`}</p></div>
        <button className="button-secondary" onClick={onNewSearch}><MagnifyingGlass size={18} />{locale === "zh" ? "新建搜索" : "New search"}</button>
      </div>

      {job.status === "partial" && <div className="flex gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--muted)]"><WarningCircle className="mt-0.5 shrink-0 text-[var(--warning)]" size={19} /><span>{locale === "zh" ? "部分学校暂时无法访问，结果来自其余成功数据源。失败学校已在搜索记录中标明。" : "Some schools could not be reached. Results include the sources that completed successfully."}</span></div>}

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={locale === "zh" ? "按学校筛选" : "Filter by school"}>
        <button className={`button-quiet !min-h-9 !px-4 ${schoolFilter === "ALL" ? "bg-[var(--accent-soft)] !text-[var(--accent)]" : ""}`} onClick={() => setSchoolFilter("ALL")}>{locale === "zh" ? "全部学校" : "All schools"}<span className="font-mono text-xs">{job.results.length}</span></button>
        {schoolIds.map((id) => { const school = getInstitution(id); const count = job.results.filter((item) => item.institutionId === id).length; return <button key={id} className={`button-quiet !min-h-9 !px-4 ${schoolFilter === id ? "bg-[var(--accent-soft)] !text-[var(--accent)]" : ""}`} onClick={() => setSchoolFilter(id)}>{school?.shortName || id}<span className="font-mono text-xs">{count}</span></button>; })}
      </div>

      {filtered.length === 0 ? (
        <div className="surface grid min-h-72 place-items-center p-8 text-center"><div><Flask className="mx-auto text-[var(--faint)]" size={34} /><h2 className="mb-0 mt-4 text-lg">{locale === "zh" ? "暂无可靠匹配" : "No reliable matches yet"}</h2><p className="mt-2 text-sm text-[var(--muted)]">{locale === "zh" ? "尝试扩大研究关键词或选择其他学校。" : "Try broader keywords or another school."}</p></div></div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(420px,1.1fr)]">
          <div className="surface overflow-hidden">
            {filtered.map((faculty) => (
              <button key={faculty.id} className={`grid w-full grid-cols-[1fr_auto] gap-4 border-b border-[var(--line)] p-4 text-left transition-colors last:border-0 hover:bg-[var(--surface-raised)] md:p-5 ${selected?.id === faculty.id ? "bg-[var(--accent-soft)]" : ""}`} onClick={() => setSelectedId(faculty.id)}>
                <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="text-[15px] font-semibold text-[var(--ink)]">{faculty.name}</span>{faculty.verification === "official" && <ShieldCheck size={17} weight="fill" className="text-[var(--accent)]" />}</span><span className="mt-1 block truncate text-xs text-[var(--faint)]">{getInstitution(faculty.institutionId)?.shortName} / {faculty.title}</span><span className="mt-3 line-clamp-2 block text-sm leading-6 text-[var(--muted)]">{faculty.researchSummary}</span><span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${faculty.admissionStatus === "not_accepting" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--surface-raised)] text-[var(--muted)]"}`}>{statusLabel[faculty.admissionStatus][locale]}</span></span>
                <span className="text-right"><span className="block font-mono text-2xl font-semibold tracking-[-0.04em] text-[var(--accent)]">{faculty.matchScore}</span><span className="text-[11px] text-[var(--faint)]">{locale === "zh" ? "匹配分" : "fit score"}</span></span>
              </button>
            ))}
          </div>

          {selected && <article className="surface overflow-hidden lg:sticky lg:top-5">
            <div className="border-b border-[var(--line)] p-5 md:p-7">
              <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="m-0 text-2xl font-semibold tracking-[-0.03em]">{selected.name}</h2>{selected.verification === "official" && <ShieldCheck size={20} weight="fill" className="text-[var(--accent)]" />}</div><p className="m-0 mt-2 text-sm text-[var(--muted)]">{selected.title}<br />{selected.institutionName}</p></div><span className="text-right"><span className="block font-mono text-3xl font-semibold text-[var(--accent)]">{selected.matchScore}</span><span className="text-xs text-[var(--faint)]">/ 100</span></span></div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button className="button-primary !min-h-9 !px-4" onClick={() => updateShortlist(selected.id, shortlist[selected.id] ? "saved" : "saved")}><BookmarkSimple size={17} weight={shortlist[selected.id] ? "fill" : "regular"} />{shortlist[selected.id] ? shortlistLabel[shortlist[selected.id]][locale] : (locale === "zh" ? "收藏导师" : "Save")}</button>
                <Dialog.Root>
                  <Dialog.Trigger><button className="button-secondary !min-h-9 !px-4" onClick={() => generateDraft(selected)}><EnvelopeSimple size={17} />{locale === "zh" ? "生成套瓷草稿" : "Draft email"}</button></Dialog.Trigger>
                  <Dialog.Content maxWidth="700px">
                    <div className="mb-5 flex items-start justify-between gap-4"><div><Dialog.Title>{locale === "zh" ? `给 ${selected.name} 的邮件草稿` : `Email draft for ${selected.name}`}</Dialog.Title><Dialog.Description>{locale === "zh" ? "发送前请逐句核对并补充附件说明。" : "Review every sentence and attachment reference before sending."}</Dialog.Description></div><Dialog.Close><button className="button-quiet !min-h-8 !p-2" aria-label="Close"><X size={18} /></button></Dialog.Close></div>
                    {draftLoading ? <div className="grid gap-3"><div className="skeleton h-11 w-full" /><div className="skeleton h-56 w-full" /></div> : draft ? <div className="grid gap-4"><label className="grid gap-2 text-sm font-semibold">{locale === "zh" ? "邮件主题" : "Subject"}<input className="field" value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} /></label><label className="grid gap-2 text-sm font-semibold">{locale === "zh" ? "正文" : "Body"}<textarea className="field min-h-72 resize-y font-mono text-sm leading-6" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-[var(--faint)]">{draft.provider === "siliconflow" ? (locale === "zh" ? "由硅基流动生成" : "Generated with SiliconFlow") : (locale === "zh" ? "安全模板回退" : "Safe template fallback")}</span><button className="button-primary" onClick={copyDraft}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? (locale === "zh" ? "已复制" : "Copied") : (locale === "zh" ? "复制邮件" : "Copy email")}</button></div></div> : <p className="text-sm text-[var(--danger)]">{locale === "zh" ? "暂时无法生成草稿，请稍后重试。" : "Draft generation failed. Please try again."}</p>}
                  </Dialog.Content>
                </Dialog.Root>
                <select className="field !min-h-9 !w-auto !rounded-full !px-3 !py-1.5 text-sm" value={shortlist[selected.id] ?? "saved"} onChange={(event) => updateShortlist(selected.id, event.target.value as ShortlistStatus)} aria-label={locale === "zh" ? "联系状态" : "Contact status"}>{Object.entries(shortlistLabel).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select>
              </div>
            </div>

            <div className="grid gap-6 p-5 md:p-7">
              <section><h3 className="m-0 text-sm font-semibold">{locale === "zh" ? "为什么匹配" : "Why this matches"}</h3><div className="mt-3 grid gap-2">{selected.matchReasons.map((reason) => <div key={reason} className="flex gap-2 text-sm leading-6 text-[var(--muted)]"><Check className="mt-1 shrink-0 text-[var(--accent)]" size={16} weight="bold" /><span>{reason}</span></div>)}</div></section>
              <section><h3 className="m-0 text-sm font-semibold">{locale === "zh" ? "近期相关成果" : "Recent relevant work"}</h3><div className="mt-3 grid gap-3">{selected.publications.slice(0, 4).map((publication) => <a key={publication.id} href={publication.url} target="_blank" rel="noreferrer" className="group grid grid-cols-[auto_1fr_auto] gap-3 rounded-[12px] bg-[var(--surface-raised)] p-3 text-inherit no-underline"><FileText className="mt-0.5 text-[var(--accent)]" size={18} /><span className="text-sm leading-5"><span className="line-clamp-2 font-medium">{publication.title}</span><span className="mt-1 block text-xs text-[var(--faint)]">{publication.year}{publication.topic ? ` / ${publication.topic}` : ""}</span></span><ArrowSquareOut className="text-[var(--faint)] group-hover:text-[var(--accent)]" size={16} /></a>)}</div></section>
              <section><h3 className="m-0 text-sm font-semibold">{locale === "zh" ? "证据与核验" : "Evidence and verification"}</h3><div className="mt-3 grid gap-2">{selected.evidence.map((evidence) => <a key={evidence.url} href={evidence.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--line)] p-3 text-sm text-[var(--muted)] no-underline hover:border-[var(--line-strong)]"><span><span className="block font-medium text-[var(--ink)]">{evidence.label}</span><span className="mt-1 block text-xs text-[var(--faint)]">{new Date(evidence.verifiedAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}</span></span><ArrowSquareOut size={17} /></a>)}</div>{selected.verification !== "official" && <p className="mb-0 mt-3 text-xs leading-5 text-[var(--warning)]">{locale === "zh" ? "尚未找到学校官方任职页面。请在联系前自行核验职位与邮箱。" : "No official faculty page was found. Verify role and email before contact."}</p>}</section>
            </div>
          </article>}
        </div>
      )}
    </section>
  );
}

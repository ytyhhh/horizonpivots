"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { loginUrl } from "@horizon/platform";
import { AppHeader } from "@/components/app-header";
import { StepRail } from "@/components/step-rail";
import { SchoolStep } from "@/components/school-step";
import { ResearchStep, type ResearchFormState } from "@/components/research-step";
import { ReviewStep } from "@/components/review-step";
import { SearchProgress } from "@/components/search-progress";
import { ResultsView } from "@/components/results-view";
import type { ApplicantProfile, SearchJob, SearchQuery } from "@/lib/types";

type AppStep = "schools" | "research" | "review" | "searching" | "results";

const initialForm: ResearchFormState = {
  doctoralField: "",
  researchDescription: "",
  keywords: "",
  departments: "",
  education: "",
  major: "",
  researchExperience: "",
  skills: "",
  publications: "",
  resumeName: "",
};

const splitList = (value: string) => value.split(/[,，;；]/).map((item) => item.trim()).filter(Boolean);
const searchEnabled = process.env.NEXT_PUBLIC_PHD_SEARCH_ENABLED === "true";

export function DiscoveryApp() {
  const { isLoaded, isSignedIn } = useAuth();
  const [locale, setLocale] = useState<"zh" | "en">("zh");
  const [step, setStep] = useState<AppStep>("schools");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState<ResearchFormState>(initialForm);
  const [job, setJob] = useState<SearchJob | null>(null);
  const [jobId, setJobId] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("phd-scope-search-form");
    if (!saved) return;
    try {
      const value = JSON.parse(saved) as { selectedIds?: string[]; form?: ResearchFormState; locale?: "zh" | "en" };
      queueMicrotask(() => {
        if (value.selectedIds) setSelectedIds(value.selectedIds.slice(0, 10));
        if (value.form) setForm({ ...initialForm, ...value.form, resumeName: "" });
        if (value.locale) setLocale(value.locale);
      });
    } catch {
      window.localStorage.removeItem("phd-scope-search-form");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("phd-scope-search-form", JSON.stringify({ selectedIds, form: { ...form, resumeName: "" }, locale }));
  }, [selectedIds, form, locale]);

  useEffect(() => {
    if (!jobId || step !== "searching") return;
    let active = true;
    let timeout: number | undefined;
    const poll = async () => {
      try {
        const response = await fetch(`/api/search-jobs/${jobId}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Search job unavailable");
        if (!active) return;
        const nextJob = payload.data as SearchJob;
        setJob(nextJob);
        if (nextJob.status === "complete" || nextJob.status === "partial") {
          setStep("results");
          return;
        }
        if (nextJob.status === "failed") {
          setError(nextJob.error || (locale === "zh" ? "检索失败，请稍后重试。" : "Search failed. Please try again."));
          return;
        }
        timeout = window.setTimeout(poll, 1000);
      } catch (pollError) {
        if (!active) return;
        setError(pollError instanceof Error ? pollError.message : "Search failed");
      }
    };
    void poll();
    return () => {
      active = false;
      if (timeout) window.clearTimeout(timeout);
    };
  }, [jobId, step, locale]);

  const profile: ApplicantProfile = useMemo(() => ({
    id: "local-profile",
    education: form.education,
    major: form.major,
    researchExperience: form.researchExperience,
    skills: splitList(form.skills),
    publications: form.publications || undefined,
  }), [form]);

  const startSearch = async () => {
    if (isLoaded && !isSignedIn) {
      window.location.assign(loginUrl(window.location.href));
      return;
    }
    setStarting(true);
    setError("");
    const query: SearchQuery = {
      selectedInstitutionIds: selectedIds,
      doctoralField: form.doctoralField,
      researchDescription: form.researchDescription,
      researchKeywords: splitList(form.keywords),
      preferredDepartments: splitList(form.departments),
      profileId: profile.id,
      profile,
      locale,
    };
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      }).catch(() => undefined);
      const response = await fetch("/api/search-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not start search");
      setJob(payload.data);
      setJobId(payload.data.id);
      setStep("searching");
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Could not start search");
    } finally {
      setStarting(false);
    }
  };

  const resetSearch = () => {
    setJob(null);
    setJobId("");
    setError("");
    setStep("schools");
  };

  const content = () => {
    if (step === "schools") return <SchoolStep locale={locale} selectedIds={selectedIds} onChange={setSelectedIds} onNext={() => setStep("research")} />;
    if (step === "research") return <ResearchStep locale={locale} value={form} onChange={setForm} onBack={() => setStep("schools")} onNext={() => setStep("review")} />;
    if (step === "review") return <ReviewStep locale={locale} selectedIds={selectedIds} form={form} loading={starting} searchEnabled={searchEnabled} onBack={() => setStep("research")} onStart={startSearch} />;
    if (step === "searching") return <SearchProgress locale={locale} job={job} error={error} onBack={() => { setJobId(""); setStep("review"); }} />;
    if (step === "results" && job) return <ResultsView locale={locale} job={job} profile={profile} onNewSearch={resetSearch} />;
    return null;
  };

  return (
    <div className="app-shell">
      <AppHeader locale={locale} onLocaleChange={() => setLocale((current) => current === "zh" ? "en" : "zh")} />
      <main className="mx-auto max-w-[1400px] px-4 py-7 md:px-8 md:py-10">
        {step !== "searching" && step !== "results" && <div className="mb-9"><StepRail current={step} locale={locale} /></div>}
        {error && step !== "searching" && <div className="mb-6 rounded-[12px] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">{error}</div>}
        {content()}
      </main>
      <footer className="mx-auto mt-10 flex max-w-[1400px] flex-col justify-between gap-2 border-t border-[var(--line)] px-4 py-7 text-xs leading-5 text-[var(--faint)] md:flex-row md:px-8">
        <span>{locale === "zh" ? "结果用于辅助研究申请。联系前请核验导师职位与招生信息。" : "Use results for application research. Verify role and recruiting status before contact."}</span>
        <span>{locale === "zh" ? "数据来源：学术记录与学校官网" : "Sources: academic records and official university pages"}</span>
      </footer>
    </div>
  );
}

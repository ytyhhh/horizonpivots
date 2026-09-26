"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import type { CandidateProfile, EducationEntry, ProjectEntry, WorkExperienceEntry } from "@/types";

const emptyEducation = (): EducationEntry => ({
  school: "", degree: "", major: "", startMonth: "", endMonth: "", coursework: "",
});
const emptyWork = (): WorkExperienceEntry => ({
  organization: "", role: "", startMonth: "", endMonth: "", achievements: "",
});
const emptyProject = (): ProjectEntry => ({
  name: "", role: "", technologies: [], outcome: "",
});

function Field({
  label, value, onChange, maxLength, type = "text", multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  type?: "text" | "month";
  multiline?: boolean;
}) {
  const className = "mt-2 w-full rounded-[0.8rem] border border-border/75 bg-background px-3 py-2.5 text-sm";
  return (
    <label className={multiline ? "sm:col-span-2" : ""}>
      <span className="text-xs font-semibold">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          maxLength={maxLength}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} min-h-24 resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} h-11`}
        />
      )}
    </label>
  );
}

function Section({
  title, hint, count, max, onAdd, children,
}: {
  title: string;
  hint: string;
  count: number;
  max: number;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 border-t border-border/70 pt-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={count >= max}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-45"
        >
          <Plus size={14} aria-hidden="true" /> 添加
        </button>
      </div>
      {count ? <div className="mt-5 space-y-4">{children}</div> : (
        <p className="mt-5 rounded-[0.8rem] bg-surface-muted px-4 py-3 text-xs text-subtle">尚未填写，可选填。</p>
      )}
    </section>
  );
}

function EntryCard({ title, onRemove, children }: {
  title: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1rem] border border-border/75 bg-background p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">{title}</h4>
        <button type="button" onClick={onRemove} className="grid size-11 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger" aria-label={`删除${title}`}>
          <Trash size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function TechnologiesEditor({ id, values, onChange }: { id: string; values: string[]; onChange: (values: string[]) => void }) {
  const [draft, setDraft] = useState("");
  function add() {
    const additions = draft.split(/[，,、;；]+/).map((value) => value.trim().slice(0, 50)).filter(Boolean);
    onChange(Array.from(new Set([...values, ...additions])).slice(0, 20));
    setDraft("");
  }
  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="text-xs font-semibold">使用技术</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <button key={value} type="button" onClick={() => onChange(values.filter((item) => item !== value))} className="rounded-full bg-accent-soft px-3 py-1.5 text-xs text-accent" aria-label={`移除技术 ${value}`}>{value} ×</button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input id={id} value={draft} maxLength={200} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); add(); } }} placeholder="输入技术，按回车添加" className="h-11 min-w-0 flex-1 rounded-[0.8rem] border border-border/75 bg-background px-3 text-sm" />
        <button type="button" onClick={add} disabled={!draft.trim() || values.length >= 20} className="min-h-11 rounded-[0.8rem] border border-border px-3 text-xs font-semibold disabled:opacity-45">添加</button>
      </div>
    </div>
  );
}

export function ProfileStructuredEditor({
  profile, onChange,
}: {
  profile: CandidateProfile;
  onChange: <K extends keyof CandidateProfile>(field: K, value: CandidateProfile[K]) => void;
}) {
  const educations = profile.educations ?? [];
  const workExperiences = profile.workExperiences ?? [];
  const projects = profile.projects ?? [];

  const updateEducation = (index: number, patch: Partial<EducationEntry>) =>
    onChange("educations", educations.map((entry, position) => position === index ? { ...entry, ...patch } : entry));
  const updateWork = (index: number, patch: Partial<WorkExperienceEntry>) =>
    onChange("workExperiences", workExperiences.map((entry, position) => position === index ? { ...entry, ...patch } : entry));
  const updateProject = (index: number, patch: Partial<ProjectEntry>) =>
    onChange("projects", projects.map((entry, position) => position === index ? { ...entry, ...patch } : entry));

  return (
    <>
      <Section title="教育经历" hint="学校、学历和课程可帮助识别专业方向；不必填写个人身份信息。" count={educations.length} max={5} onAdd={() => onChange("educations", [...educations, emptyEducation()])}>
        {educations.map((entry, index) => (
          <EntryCard key={index} title={`教育经历 ${index + 1}`} onRemove={() => onChange("educations", educations.filter((_, position) => position !== index))}>
            <Field label="学校" value={entry.school} maxLength={100} onChange={(school) => updateEducation(index, { school })} />
            <Field label="学历 / 学位" value={entry.degree} maxLength={40} onChange={(degree) => updateEducation(index, { degree })} />
            <Field label="专业" value={entry.major} maxLength={80} onChange={(major) => updateEducation(index, { major })} />
            <div className="hidden sm:block" />
            <Field label="开始月份" type="month" value={entry.startMonth} onChange={(startMonth) => updateEducation(index, { startMonth })} />
            <Field label="结束月份" type="month" value={entry.endMonth} onChange={(endMonth) => updateEducation(index, { endMonth })} />
            <Field label="相关课程" value={entry.coursework} maxLength={300} multiline onChange={(coursework) => updateEducation(index, { coursework })} />
          </EntryCard>
        ))}
      </Section>

      <Section title="实习 / 工作经历" hint="侧重岗位职责和可公开的成果，不填写公司机密。" count={workExperiences.length} max={10} onAdd={() => onChange("workExperiences", [...workExperiences, emptyWork()])}>
        {workExperiences.map((entry, index) => (
          <EntryCard key={index} title={`工作经历 ${index + 1}`} onRemove={() => onChange("workExperiences", workExperiences.filter((_, position) => position !== index))}>
            <Field label="单位" value={entry.organization} maxLength={100} onChange={(organization) => updateWork(index, { organization })} />
            <Field label="岗位" value={entry.role} maxLength={80} onChange={(role) => updateWork(index, { role })} />
            <Field label="开始月份" type="month" value={entry.startMonth} onChange={(startMonth) => updateWork(index, { startMonth })} />
            <Field label="结束月份" type="month" value={entry.endMonth} onChange={(endMonth) => updateWork(index, { endMonth })} />
            <Field label="主要成果" value={entry.achievements} maxLength={500} multiline onChange={(achievements) => updateWork(index, { achievements })} />
          </EntryCard>
        ))}
      </Section>

      <Section title="项目经历" hint="写清你的角色、使用的技术和项目成果。" count={projects.length} max={10} onAdd={() => onChange("projects", [...projects, emptyProject()])}>
        {projects.map((entry, index) => (
          <EntryCard key={index} title={`项目经历 ${index + 1}`} onRemove={() => onChange("projects", projects.filter((_, position) => position !== index))}>
            <Field label="项目名称" value={entry.name} maxLength={100} onChange={(name) => updateProject(index, { name })} />
            <Field label="担任角色" value={entry.role} maxLength={80} onChange={(role) => updateProject(index, { role })} />
            <TechnologiesEditor id={`profile-project-technologies-${index}`} values={entry.technologies} onChange={(technologies) => updateProject(index, { technologies })} />
            <Field label="项目成果" value={entry.outcome} maxLength={500} multiline onChange={(outcome) => updateProject(index, { outcome })} />
          </EntryCard>
        ))}
      </Section>
    </>
  );
}

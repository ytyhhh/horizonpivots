"use client";

import { ArrowLeft, ArrowRight, FilePdf, Info, UserFocus } from "@phosphor-icons/react";
import { useState } from "react";

export type ResearchFormState = {
  doctoralField: string;
  researchDescription: string;
  keywords: string;
  departments: string;
  education: string;
  major: string;
  researchExperience: string;
  skills: string;
  publications: string;
  resumeName: string;
};

export function ResearchStep({
  locale,
  value,
  onChange,
  onBack,
  onNext,
}: {
  locale: "zh" | "en";
  value: ResearchFormState;
  onChange: (value: ResearchFormState) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [resumeMessage, setResumeMessage] = useState("");
  const set = (key: keyof ResearchFormState, nextValue: string) => onChange({ ...value, [key]: nextValue });
  const valid = value.doctoralField.trim().length >= 2 && value.researchDescription.trim().length >= 12 && value.keywords.trim().length > 0;

  const handleResume = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) {
      setResumeMessage(locale === "zh" ? "请选择不超过 10 MB 的 PDF 文件。" : "Choose a PDF file up to 10 MB.");
      return;
    }
    set("resumeName", file.name);
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/resumes", { method: "POST", body });
    const payload = await response.json();
    setResumeMessage(response.ok
      ? locale === "zh" ? "简历已保存到你的私有空间。" : "Resume saved to your private storage."
      : payload.error || (locale === "zh" ? "请先登录后上传简历。" : "Sign in before uploading your resume."));
  };

  return (
    <section className="grid gap-7">
      <div className="max-w-2xl">
        <h1 className="m-0 text-3xl font-semibold tracking-[-0.035em] md:text-[42px] md:leading-[1.08]">{locale === "zh" ? "描述你真正想研究的问题" : "Describe the problem you want to study"}</h1>
        <p className="mt-4 max-w-[62ch] text-base leading-7 text-[var(--muted)]">{locale === "zh" ? "具体的研究问题、方法和技能，比宽泛的专业名称更能找到合适导师。" : "Specific questions, methods, and skills produce better matches than a broad subject name."}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <div className="surface grid gap-5 p-5 md:p-7">
          <div className="grid gap-2">
            <label className="text-sm font-semibold" htmlFor="doctoral-field">{locale === "zh" ? "博士专业" : "Doctoral field"}</label>
            <input id="doctoral-field" className="field" value={value.doctoralField} onChange={(event) => set("doctoralField", event.target.value)} placeholder={locale === "zh" ? "例如：计算机科学、教育学、材料科学" : "e.g. Computer Science, Education, Materials Science"} />
            <p className="m-0 text-xs leading-5 text-[var(--faint)]">{locale === "zh" ? "填写计划申请的博士学科。" : "The PhD discipline you plan to apply for."}</p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold" htmlFor="research-description">{locale === "zh" ? "研究方向与问题" : "Research direction and question"}</label>
            <textarea id="research-description" className="field min-h-36 resize-y" value={value.researchDescription} onChange={(event) => set("researchDescription", event.target.value)} placeholder={locale === "zh" ? "描述你关注的研究问题、对象、理论或希望使用的方法。" : "Describe the problem, population, theory, or methods you want to study."} />
            <p className="m-0 text-xs leading-5 text-[var(--faint)]">{locale === "zh" ? "建议 80-300 字。系统不会把你的描述公开。" : "Aim for 80-300 words. This description is not made public."}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-semibold" htmlFor="keywords">{locale === "zh" ? "研究关键词" : "Research keywords"}</label>
              <input id="keywords" className="field" value={value.keywords} onChange={(event) => set("keywords", event.target.value)} placeholder={locale === "zh" ? "大模型, 多模态, 医疗" : "LLMs, multimodal, healthcare"} />
              <p className="m-0 text-xs leading-5 text-[var(--faint)]">{locale === "zh" ? "使用逗号分隔，至少填写一个。" : "Comma-separated, at least one."}</p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold" htmlFor="departments">{locale === "zh" ? "偏好院系（可选）" : "Preferred departments (optional)"}</label>
              <input id="departments" className="field" value={value.departments} onChange={(event) => set("departments", event.target.value)} placeholder={locale === "zh" ? "计算机系, 医学院" : "Computer Science, Medicine"} />
              <p className="m-0 text-xs leading-5 text-[var(--faint)]">{locale === "zh" ? "不填写时会搜索相关院系。" : "Leave blank to search across relevant departments."}</p>
            </div>
          </div>
        </div>

        <aside className="surface grid content-start gap-5 p-5 md:p-7">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[var(--accent-soft)] text-[var(--accent)]"><UserFocus size={21} /></span>
            <div><h2 className="m-0 text-lg font-semibold">{locale === "zh" ? "申请人背景" : "Applicant profile"}</h2><p className="mb-0 mt-1 text-sm leading-6 text-[var(--muted)]">{locale === "zh" ? "用于判断方法与经历是否匹配，不参与公开搜索。" : "Used to assess methods fit. Never included in public search."}</p></div>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">{locale === "zh" ? "当前学历" : "Current education"}<input className="field" value={value.education} onChange={(event) => set("education", event.target.value)} placeholder={locale === "zh" ? "硕士在读 / 已毕业" : "Master's student / graduate"} /></label>
            <label className="grid gap-2 text-sm font-semibold">{locale === "zh" ? "当前专业" : "Current major"}<input className="field" value={value.major} onChange={(event) => set("major", event.target.value)} placeholder={locale === "zh" ? "例如：数据科学" : "e.g. Data Science"} /></label>
            <label className="grid gap-2 text-sm font-semibold">{locale === "zh" ? "研究经历" : "Research experience"}<textarea className="field min-h-24 resize-y" value={value.researchExperience} onChange={(event) => set("researchExperience", event.target.value)} placeholder={locale === "zh" ? "项目、毕业论文或助研经历" : "Projects, thesis, or research assistant experience"} /></label>
            <label className="grid gap-2 text-sm font-semibold">{locale === "zh" ? "方法与技能" : "Methods and skills"}<input className="field" value={value.skills} onChange={(event) => set("skills", event.target.value)} placeholder={locale === "zh" ? "Python, 访谈, 因果推断" : "Python, interviews, causal inference"} /></label>
            <label className="grid gap-2 text-sm font-semibold">{locale === "zh" ? "论文或成果（可选）" : "Publications (optional)"}<textarea className="field min-h-20 resize-y" value={value.publications} onChange={(event) => set("publications", event.target.value)} placeholder={locale === "zh" ? "填写题目或简要说明" : "Titles or a short description"} /></label>
            <label className="grid cursor-pointer gap-2 text-sm font-semibold">
              {locale === "zh" ? "PDF 简历（可选）" : "PDF resume (optional)"}
              <span className="flex min-h-20 items-center gap-3 rounded-[12px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-raised)] px-4 text-sm font-normal text-[var(--muted)]">
                <FilePdf size={24} className="text-[var(--accent)]" />
                {value.resumeName || (locale === "zh" ? "选择不超过 10 MB 的可复制文字 PDF" : "Choose a text-based PDF up to 10 MB")}
              </span>
              <input className="sr-only" type="file" accept="application/pdf" onChange={(event) => void handleResume(event.target.files?.[0])} />
            </label>
          </div>
          <div className="flex gap-2 rounded-[12px] bg-[var(--accent-soft)] p-3 text-xs leading-5 text-[var(--muted)]"><Info className="mt-0.5 shrink-0 text-[var(--accent)]" size={16} /><span>{resumeMessage || (locale === "zh" ? "登录后可将 PDF 保存到仅自己可访问的私有空间。" : "After signing in, your PDF is stored in a private space only you can access.")}</span></div>
        </aside>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button className="button-secondary" onClick={onBack}><ArrowLeft size={18} />{locale === "zh" ? "返回选校" : "Back"}</button>
        <button className="button-primary" disabled={!valid} onClick={onNext}>{locale === "zh" ? "检查搜索条件" : "Review search"}<ArrowRight size={18} /></button>
      </div>
    </section>
  );
}

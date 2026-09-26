"use client";

import {
  CheckCircle,
  FileDoc,
  FilePdf,
  Plus,
  ShieldCheck,
  SpinnerGap,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { ProfileStructuredEditor } from "@/components/profile-structured-editor";
import { INDUSTRIES, type CandidateProfile } from "@/types";

type UploadState = "idle" | "uploading" | "success" | "error";
type BusyAction = "saving" | "deleting" | null;

function normalizeProfile(profile: CandidateProfile): CandidateProfile {
  return {
    ...profile,
    educations: profile.educations ?? [],
    workExperiences: profile.workExperiences ?? [],
    projects: profile.projects ?? [],
    languages: profile.languages ?? [],
    certifications: profile.certifications ?? [],
  };
}

function emptyProfile(current: CandidateProfile): CandidateProfile {
  return {
    userId: current.userId,
    graduationYear: null,
    education: "",
    major: "",
    skills: [],
    experiences: [],
    projectDomains: [],
    educations: [],
    workExperiences: [],
    projects: [],
    languages: [],
    certifications: [],
    preferredLocations: [],
    preferredIndustries: [],
    preferredRoles: [],
    excludedCompanies: [],
    confirmed: false,
    version: 0,
  };
}

function EditableList({
  id,
  label,
  description,
  placeholder,
  values,
  maxItems,
  maxLength,
  multiline = false,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  values: string[];
  maxItems: number;
  maxLength: number;
  multiline?: boolean;
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addDraft() {
    const separator = multiline ? /\n+/ : /[、,，;；\n]+/;
    const additions = draft
      .split(separator)
      .map((value) => value.replace(/\s+/g, " ").trim().slice(0, maxLength))
      .filter(Boolean);
    if (!additions.length) return;

    const next = [...values];
    for (const addition of additions) {
      if (next.length >= maxItems) break;
      if (
        !next.some(
          (value) => value.toLocaleLowerCase() === addition.toLocaleLowerCase(),
        )
      ) {
        next.push(addition);
      }
    }
    onChange(next);
    setDraft("");
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold">
          {label}
        </label>
        <span className="text-[10px] text-subtle">
          {values.length} / {maxItems}
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-subtle">{description}</p>
      {values.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent"
            >
              <span className="min-w-0 break-words">{value}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter((item) => item !== value))}
                className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-surface"
                aria-label={`删除${label}：${value}`}
              >
                <X size={12} weight="bold" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex items-stretch gap-2">
        {multiline ? (
          <textarea
            id={id}
            value={draft}
            maxLength={maxLength}
            rows={2}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                addDraft();
              }
            }}
            placeholder={placeholder}
            className="min-h-20 flex-1 resize-y rounded-[0.8rem] border border-border/75 bg-background px-3 py-2.5 text-sm"
          />
        ) : (
          <input
            id={id}
            value={draft}
            maxLength={maxLength}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                addDraft();
              }
            }}
            placeholder={placeholder}
            className="h-11 min-w-0 flex-1 rounded-[0.8rem] border border-border/75 bg-background px-3 text-sm"
          />
        )}
        <button
          type="button"
          onClick={addDraft}
          disabled={!draft.trim() || values.length >= maxItems}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-[0.8rem] border border-border/75 px-3 text-xs font-semibold text-muted hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus size={14} weight="bold" aria-hidden="true" />
          添加
        </button>
      </div>
    </div>
  );
}

function ChoiceEditor<T extends string>({
  label,
  description,
  options,
  selected,
  onChange,
}: {
  label: string;
  description: string;
  options: readonly T[];
  selected: T[];
  onChange: (values: T[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold">{label}</legend>
      <p className="mt-1 text-xs leading-5 text-subtle">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active
                    ? selected.filter((value) => value !== option)
                    : [...selected, option],
                )
              }
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-accent bg-accent text-white"
                  : "border-border/75 bg-background text-muted hover:border-accent/55 hover:text-foreground"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProfileClient({
  initialProfile,
  demoMode,
}: {
  initialProfile: CandidateProfile;
  demoMode: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(() => normalizeProfile(initialProfile));
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const [entryMode, setEntryMode] = useState<"manual" | "upload">("manual");
  const [dirty, setDirty] = useState(false);

  function updateField<K extends keyof CandidateProfile>(
    field: K,
    value: CandidateProfile[K],
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
      confirmed: false,
    }));
    setDirty(true);
  }

  async function submitFile(file?: File) {
    if (!file) return;
    setMessage("");
    if (dirty) {
      setUploadState("error");
      setMessage("请先保存手填草稿，再上传简历补充空白字段。");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadState("error");
      setMessage("文件不能超过 5 MB");
      return;
    }
    const valid =
      file.type === "application/pdf" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!valid) {
      setUploadState("error");
      setMessage("仅支持 PDF 或 DOCX");
      return;
    }

    setUploadState("uploading");
    const body = new FormData();
    body.set("resume", file);
    try {
      const response = await fetch("/api/resumes", { method: "POST", body });
      const data = (await response.json()) as {
        profile?: CandidateProfile;
        message?: string;
      };
      if (!response.ok) throw new Error(data.message ?? "解析失败");
      if (data.profile) {
        setProfile(normalizeProfile(data.profile));
        setDirty(false);
      }
      setUploadState("success");
      setMessage(
        demoMode
          ? "演示模式已完成安全校验并载入示例画像。"
          : "解析完成，仅补充了空白基础字段；请检查后保存或确认画像。",
      );
    } catch (error) {
      setUploadState("error");
      setMessage(error instanceof Error ? error.message : "解析失败，请稍后重试");
    }
  }

  async function saveProfile(confirmed: boolean) {
    setMessage("");
    setBusyAction("saving");
    if (demoMode) {
      setProfile((current) => ({
        ...current,
        confirmed,
        version: Math.max(1, current.version + 1),
      }));
      setUploadState("success");
      setMessage(confirmed ? "已在本次演示会话中确认画像。" : "已在本次演示会话中保存草稿。");
      setDirty(false);
      setBusyAction(null);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: profile.version,
          profile: {
            graduationYear: profile.graduationYear,
            education: profile.education ?? "",
            major: profile.major ?? "",
            skills: profile.skills,
            experiences: profile.experiences,
            projectDomains: profile.projectDomains,
            educations: profile.educations ?? [],
            workExperiences: profile.workExperiences ?? [],
            projects: profile.projects ?? [],
            languages: profile.languages ?? [],
            certifications: profile.certifications ?? [],
            preferredLocations: profile.preferredLocations,
            preferredIndustries: profile.preferredIndustries,
            preferredRoles: profile.preferredRoles,
            excludedCompanies: profile.excludedCompanies,
            confirmed,
          },
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        data?: CandidateProfile;
        message?: string;
        detail?: string;
      } | null;
      if (response.status === 409) {
        setUploadState("error");
        setMessage(data?.message ?? "画像已在其他页面更新，请刷新后再保存。");
        return;
      }
      if (!response.ok) throw new Error(data?.detail ?? data?.message ?? "保存失败");
      setProfile(
        data?.data
          ? normalizeProfile(data.data)
          : (current) => ({
              ...current,
              confirmed,
              version: current.version + 1,
            }),
      );
      setUploadState("success");
      setMessage(confirmed ? "画像已保存并用于推荐。" : "草稿已保存，确认前不会用于推荐。");
      setDirty(false);
    } catch (error) {
      setUploadState("error");
      setMessage(error instanceof Error ? error.message : "暂时无法保存，请稍后重试。");
    } finally {
      setBusyAction(null);
    }
  }

  async function clearProfile() {
    if (
      !window.confirm(
        "确认清除求职画像和推荐缓存吗？你收藏的岗位会保留。",
      )
    ) {
      return;
    }

    setMessage("");
    setBusyAction("deleting");
    if (demoMode) {
      setProfile((current) => emptyProfile(current));
      setUploadState("idle");
      setMessage("本次演示会话中的画像已清除，收藏岗位未受影响。");
      setDirty(false);
      setBusyAction(null);
      return;
    }

    try {
      const response = await fetch("/api/profile", { method: "DELETE" });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!response.ok) throw new Error(data?.message ?? "清除失败");
      setProfile((current) => emptyProfile(current));
      setUploadState("idle");
      setMessage("画像和推荐缓存已清除，收藏岗位已保留。");
      setDirty(false);
    } catch (error) {
      setUploadState("error");
      setMessage(error instanceof Error ? error.message : "暂时无法清除，请稍后重试。");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <div className="mb-6 inline-flex rounded-full border border-border bg-surface p-1" aria-label="建立画像的方式">
        <button type="button" aria-pressed={entryMode === "manual"} onClick={() => setEntryMode("manual")} className={`min-h-11 rounded-full px-5 text-sm font-semibold ${entryMode === "manual" ? "bg-accent text-white" : "text-muted"}`}>手动填写</button>
        <button type="button" aria-pressed={entryMode === "upload"} onClick={() => setEntryMode("upload")} className={`min-h-11 rounded-full px-5 text-sm font-semibold ${entryMode === "upload" ? "bg-accent text-white" : "text-muted"}`}>上传简历辅助填写</button>
      </div>
      <p className="mb-5 text-sm text-muted">{entryMode === "manual" ? "不上传文件也能建立画像；可先保存草稿，确认后再用于推荐。" : "解析仅补充未填写的基础字段，手动填写的条目和求职偏好不会被覆盖。"}</p>

      <div className={`grid items-start gap-5 ${entryMode === "upload" ? "lg:grid-cols-[.72fr_1.28fr]" : "max-w-4xl"}`}>
        {entryMode === "upload" ? <section className="panel-shell">
          <div className="panel-core p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
                <ShieldCheck size={22} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold">上传后解析，原文件立即删除</h2>
                <p className="mt-1 text-xs leading-5 text-muted">
                  只解析非敏感的基础信息；手填条目不会被覆盖，也不会长期保存原文件。
                </p>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                void submitFile(file);
              }}
            />
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                submitFile(event.dataTransfer.files[0]);
              }}
              className={`mt-6 grid min-h-60 w-full place-items-center rounded-[1rem] border border-dashed p-6 text-center disabled:cursor-not-allowed disabled:opacity-55 ${
                dragging
                  ? "border-accent bg-accent-soft"
                  : "bg-background hover:border-accent"
              }`}
            >
              {uploadState === "uploading" ? (
                <div data-reveal>
                  <SpinnerGap
                    size={34}
                    weight="bold"
                    className="mx-auto animate-spin text-accent"
                    aria-hidden="true"
                  />
                  <p className="mt-4 font-semibold">正在安全解析</p>
                  <p className="mt-2 text-xs text-muted">通常需要几秒钟</p>
                </div>
              ) : (
                <div>
                  <UploadSimple
                    size={34}
                    weight="duotone"
                    className="mx-auto text-accent"
                    aria-hidden="true"
                  />
                  <p className="mt-4 font-semibold">选择或拖入简历</p>
                  <p className="mt-2 text-xs text-muted">
                    PDF（需可复制文字）/ DOCX，最大 5 MB
                  </p>
                  <div className="mt-4 flex justify-center gap-2 text-subtle">
                    <FilePdf size={20} weight="duotone" aria-hidden="true" />
                    <FileDoc size={20} weight="duotone" aria-hidden="true" />
                  </div>
                </div>
              )}
            </button>

          </div>
        </section> : null}

        <section className="panel-shell">
          <div className="panel-core p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em]">
                  求职画像
                </h2>
                <p className="mt-1 text-sm text-muted">
                  自己填写或检查简历提取结果；保存草稿不会生成推荐，确认后才会用于匹配。
                </p>
              </div>
              <button
                type="button"
                onClick={clearProfile}
                disabled={busyAction !== null}
                className="grid size-10 place-items-center rounded-full border border-border/75 text-muted hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="清除个性化数据"
              >
                {busyAction === "deleting" ? (
                  <SpinnerGap size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Trash size={18} weight="bold" aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label>
                <span className="text-xs font-semibold">毕业年份</span>
                <input
                  type="number"
                  min={2024}
                  max={2035}
                  value={profile.graduationYear ?? ""}
                  onChange={(event) =>
                    updateField(
                      "graduationYear",
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                  className="mt-2 h-11 w-full rounded-[0.8rem] border border-border/75 bg-background px-3 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-semibold">学历</span>
                <input
                  value={profile.education ?? ""}
                  maxLength={30}
                  onChange={(event) => updateField("education", event.target.value)}
                  className="mt-2 h-11 w-full rounded-[0.8rem] border border-border/75 bg-background px-3 text-sm"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs font-semibold">专业</span>
                <input
                  value={profile.major ?? ""}
                  maxLength={80}
                  onChange={(event) => updateField("major", event.target.value)}
                  className="mt-2 h-11 w-full rounded-[0.8rem] border border-border/75 bg-background px-3 text-sm"
                />
              </label>
            </div>

            <ProfileStructuredEditor profile={profile} onChange={updateField} />

            <div className="mt-7 grid gap-6 border-t border-border/70 pt-7">
              <div>
                <h3 className="font-semibold">技能与证书</h3>
                <p className="mt-1 text-xs leading-5 text-muted">以下字段可手动填写，也可保留简历解析得到的技能与摘要。</p>
              </div>
              <EditableList
                id="profile-skills"
                label="技能"
                description="保留真正能在项目或经历中证明的技能。"
                placeholder="输入技能，按回车添加"
                values={profile.skills}
                maxItems={40}
                maxLength={50}
                onChange={(values) => updateField("skills", values)}
              />
              <EditableList
                id="profile-languages"
                label="语言能力"
                description="例如英语 CET-6、日语 N2。"
                placeholder="输入语言能力，按回车添加"
                values={profile.languages ?? []}
                maxItems={20}
                maxLength={50}
                onChange={(values) => updateField("languages", values)}
              />
              <EditableList
                id="profile-certifications"
                label="证书与资格"
                description="只填写与求职有关的资格和证书。"
                placeholder="输入证书，按回车添加"
                values={profile.certifications ?? []}
                maxItems={20}
                maxLength={100}
                onChange={(values) => updateField("certifications", values)}
              />
              <EditableList
                id="profile-projects"
                label="项目领域"
                description="例如推荐系统、具身智能、消费互联网。"
                placeholder="输入项目领域，按回车添加"
                values={profile.projectDomains}
                maxItems={20}
                maxLength={60}
                onChange={(values) => updateField("projectDomains", values)}
              />
              <EditableList
                id="profile-experiences"
                label="经历摘要（可选补充）"
                description="每条写清做过什么；Shift + Enter 可在输入框内换行。"
                placeholder="输入一条经历摘要"
                values={profile.experiences}
                maxItems={12}
                maxLength={240}
                multiline
                onChange={(values) => updateField("experiences", values)}
              />
            </div>

            <div className="mt-8 grid gap-6 border-t border-border/70 pt-7">
              <div>
                <p className="eyebrow">求职偏好</p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  留空表示不限制，不会被当作不匹配。
                </p>
              </div>
              <EditableList
                id="preferred-roles"
                label="岗位方向"
                description="例如算法、后端开发、AI 产品。"
                placeholder="输入岗位方向，按回车添加"
                values={profile.preferredRoles}
                maxItems={20}
                maxLength={50}
                onChange={(values) => updateField("preferredRoles", values)}
              />
              <EditableList
                id="preferred-locations"
                label="期望地点"
                description="可添加城市或区域；不填写时接受所有地点。"
                placeholder="输入地点，按回车添加"
                values={profile.preferredLocations}
                maxItems={20}
                maxLength={30}
                onChange={(values) => updateField("preferredLocations", values)}
              />
              <ChoiceEditor
                label="期望行业"
                description="可多选；不选择时不限制行业。"
                options={INDUSTRIES}
                selected={profile.preferredIndustries}
                onChange={(values) => updateField("preferredIndustries", values)}
              />
              <EditableList
                id="excluded-companies"
                label="不推荐的公司"
                description="这些公司会从你的个性化推荐中排除。"
                placeholder="输入公司名称，按回车添加"
                values={profile.excludedCompanies}
                maxItems={50}
                maxLength={80}
                onChange={(values) => updateField("excludedCompanies", values)}
              />
            </div>

            {message ? (
              <div role={uploadState === "error" ? "alert" : "status"} className={`mt-7 flex gap-2 rounded-[0.85rem] p-3 text-xs leading-5 ${uploadState === "error" ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"}`}>
                {uploadState === "error" ? <WarningCircle size={17} weight="fill" className="shrink-0" /> : <CheckCircle size={17} weight="fill" className="shrink-0" />}
                {message}
              </div>
            ) : null}
            {dirty ? <p className="mt-6 text-xs font-semibold text-accent" role="status">有尚未保存的修改</p> : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => saveProfile(false)} disabled={busyAction !== null || uploadState === "uploading"} className="tactile inline-flex min-h-12 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold hover:border-accent hover:text-accent disabled:opacity-55">
                保存草稿
              </button>
              <button type="button" onClick={() => saveProfile(true)} disabled={busyAction !== null || uploadState === "uploading"} className="tactile inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-55">
                {busyAction === "saving" ? <SpinnerGap size={18} className="animate-spin" aria-hidden="true" /> : null}
                {busyAction === "saving" ? "正在保存" : "确认并用于推荐"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

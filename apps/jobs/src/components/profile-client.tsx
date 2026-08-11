"use client";

import {
  CheckCircle,
  FileDoc,
  FilePdf,
  ShieldCheck,
  SpinnerGap,
  Trash,
  UploadSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import type { CandidateProfile } from "@/types";

type UploadState = "idle" | "uploading" | "success" | "error";

function ChipList({
  values,
  empty,
}: {
  values: string[];
  empty: string;
}) {
  return values.length ? (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent"
        >
          {value}
        </span>
      ))}
    </div>
  ) : (
    <p className="text-sm text-subtle">{empty}</p>
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
  const [profile, setProfile] = useState(initialProfile);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);

  async function submitFile(file?: File) {
    if (!file) return;
    setMessage("");
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
      if (data.profile) setProfile(data.profile);
      setUploadState("success");
      setMessage(demoMode ? "演示模式已完成安全校验并载入示例画像。" : "解析完成，请确认画像。");
    } catch (error) {
      setUploadState("error");
      setMessage(error instanceof Error ? error.message : "解析失败，请稍后重试");
    }
  }

  async function saveProfile() {
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, confirmed: true }),
      });
      if (!response.ok) throw new Error("保存失败");
      setProfile((current) => ({ ...current, confirmed: true }));
      setUploadState("success");
      setMessage(demoMode ? "已在本次演示会话中确认画像。" : "画像已保存。");
    } catch {
      setUploadState("error");
      setMessage("暂时无法保存，请稍后重试。");
    }
  }

  function clearProfile() {
    setProfile({
      skills: [],
      experiences: [],
      projectDomains: [],
      preferredLocations: [],
      preferredIndustries: [],
      preferredRoles: [],
      excludedCompanies: [],
      confirmed: false,
      version: profile.version + 1,
    });
    setUploadState("idle");
    setMessage("结构化画像已从当前页面清除。");
  }

  const steps = [
    { label: "上传", active: true },
    {
      label: "解析",
      active:
        profile.confirmed || uploadState === "uploading" || uploadState === "success",
    },
    { label: "确认", active: uploadState === "success" || profile.confirmed },
    { label: "用于推荐", active: profile.confirmed },
  ];

  return (
    <>
      <ol className="mb-6 grid grid-cols-4 overflow-hidden rounded-[1rem] bg-surface" aria-label="简历画像流程">
        {steps.map((step, index) => (
          <li key={step.label} className="relative flex min-h-16 items-center gap-3 px-3 sm:px-5">
            {index ? <span className="absolute left-0 top-1/2 hidden h-6 w-px -translate-y-1/2 bg-border sm:block" /> : null}
            <span className={`grid size-6 shrink-0 place-items-center rounded-full font-mono text-[10px] ${step.active ? "bg-accent text-white" : "bg-surface-muted text-subtle"}`}>
              {index + 1}
            </span>
            <span className={`hidden text-xs font-semibold sm:block ${step.active ? "text-foreground" : "text-subtle"}`}>{step.label}</span>
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-5 lg:grid-cols-[.78fr_1.22fr]">
      <section className="panel-shell">
        <div className="panel-core p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
            <ShieldCheck size={22} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">上传后解析，原文件立即删除</h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              仅保存技能、教育和经历摘要，不保存姓名、电话、邮箱、照片等身份信息。
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={(event) => submitFile(event.target.files?.[0])}
        />
        <button
          type="button"
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
          className={`mt-6 grid min-h-60 w-full place-items-center rounded-[1rem] border border-dashed p-6 text-center ${
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
              <p className="mt-2 text-xs text-muted">PDF（需可复制文字）/ DOCX，最大 5 MB</p>
              <div className="mt-4 flex justify-center gap-2 text-subtle">
                <FilePdf size={20} weight="duotone" aria-hidden="true" />
                <FileDoc size={20} weight="duotone" aria-hidden="true" />
              </div>
            </div>
          )}
        </button>

        {message ? (
          <div
            role={uploadState === "error" ? "alert" : "status"}
            className={`mt-4 flex gap-2 rounded-[0.85rem] p-3 text-xs leading-5 ${
              uploadState === "error"
                ? "bg-danger-soft text-danger"
                : "bg-accent-soft text-accent"
            }`}
          >
            {uploadState === "error" ? (
              <WarningCircle size={17} weight="fill" className="shrink-0" />
            ) : (
              <CheckCircle size={17} weight="fill" className="shrink-0" />
            )}
            {message}
          </div>
        ) : null}
        </div>
      </section>

      <section className="panel-shell">
        <div className="panel-core p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em]">求职画像</h2>
            <p className="mt-1 text-sm text-muted">
              确认后才会用于岗位推荐，你可以随时修改。
            </p>
          </div>
          <button
            type="button"
            onClick={clearProfile}
            className="grid size-10 place-items-center rounded-full border border-border/75 text-muted hover:border-danger hover:text-danger"
            aria-label="清除画像"
          >
            <Trash size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label>
            <span className="text-xs font-semibold">毕业年份</span>
            <input
              type="number"
              value={profile.graduationYear ?? ""}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  graduationYear: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              className="mt-2 h-11 w-full rounded-[0.8rem] border border-border/75 bg-background px-3 text-sm"
            />
          </label>
          <label>
            <span className="text-xs font-semibold">学历</span>
            <input
              value={profile.education ?? ""}
              onChange={(event) =>
                setProfile({ ...profile, education: event.target.value })
              }
              className="mt-2 h-11 w-full rounded-[0.8rem] border border-border/75 bg-background px-3 text-sm"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs font-semibold">专业</span>
            <input
              value={profile.major ?? ""}
              onChange={(event) =>
                setProfile({ ...profile, major: event.target.value })
              }
              className="mt-2 h-11 w-full rounded-[0.8rem] border border-border/75 bg-background px-3 text-sm"
            />
          </label>
        </div>

        <div className="mt-7 border-t pt-6">
          <p className="mb-3 text-xs font-semibold">技能</p>
          <ChipList values={profile.skills} empty="上传简历后自动提取技能" />
        </div>
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold">经历摘要</p>
          {profile.experiences.length ? (
            <ul className="grid gap-2 text-sm leading-6 text-muted">
              {profile.experiences.map((item) => (
                <li key={item} className="rounded-[0.8rem] bg-surface-muted px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-subtle">暂无经历摘要</p>
          )}
        </div>

        <button
          type="button"
          onClick={saveProfile}
          className="tactile mt-7 h-12 w-full rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong"
        >
          确认并用于推荐
        </button>
        </div>
      </section>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowClockwise,
  CheckCircle,
  Clock,
  Database,
  Pause,
  Play,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import type { AdminDashboardData } from "@/lib/admin-dashboard";

function formatTime(value?: string | null) {
  if (!value) return "尚未运行";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function mutate(key: string, url: string, body?: unknown) {
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch(url, {
        method: body ? "PATCH" : "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message ?? "操作失败");
      setMessage("操作已完成");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page-shell pb-12 pt-7 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">System status</p>
          <h1 className="utility-title mt-5">数据运行状态</h1>
          <p className="mt-3 text-sm leading-6 text-muted">官方来源、同步结果、邮件日报和人工审核均来自实时数据。</p>
        </div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => mutate("sync", "/api/admin/sync")}
          className="button-primary !min-h-11 !px-4 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ArrowClockwise size={18} weight="bold" className={busy === "sync" ? "animate-spin" : ""} />
          立即同步
        </button>
      </div>
      {message ? <p role="status" className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-sm">{message}</p> : null}

      <dl className="mt-8 grid gap-px overflow-hidden rounded-[1.15rem] bg-border/70 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["已发布岗位", String(data.metrics.jobs), Database],
          ["健康来源", `${data.metrics.healthySources} / ${data.metrics.totalSources}`, CheckCircle],
          ["待人工确认", String(data.metrics.openReviews), WarningCircle],
          ["异常来源", String(data.metrics.failedSources), XCircle],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="bg-surface p-5">
            <Icon size={22} weight="duotone" className="text-accent" />
            <dt className="mt-5 text-xs text-muted">{String(label)}</dt>
            <dd className="mt-1 font-mono text-xl font-semibold">{String(value)}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">数据源</h2>
        <div className="mt-4 overflow-hidden rounded-[1.15rem] bg-surface ring-1 ring-border/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-surface-muted text-xs text-muted">
                <tr><th className="px-5 py-3">名称</th><th className="px-5 py-3">状态</th><th className="px-5 py-3">信任</th><th className="px-5 py-3">最近成功</th><th className="px-5 py-3">下次运行</th><th className="px-5 py-3 text-right">操作</th></tr>
              </thead>
              <tbody>
                {data.sources.map((source) => (
                  <tr key={source.id} className="border-t border-border/70 align-top">
                    <td className="px-5 py-4"><p className="font-semibold">{source.name}</p><p className="mt-1 max-w-[300px] truncate text-xs text-muted">{source.root_domain ?? source.url}</p>{source.last_error ? <p className="mt-2 max-w-[360px] text-xs text-warning">{source.last_error}</p> : null}</td>
                    <td className="px-5 py-4"><span className={source.health === "healthy" ? "text-accent" : "text-warning"}>{source.health}</span></td>
                    <td className="px-5 py-4 font-mono">{source.trust_score ?? 0}</td>
                    <td className="px-5 py-4 text-muted">{formatTime(source.last_success_at)}</td>
                    <td className="px-5 py-4 text-muted">{formatTime(source.next_run_at)}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2">
                      <button className="button-secondary !min-h-9 !px-3" disabled={busy !== null} onClick={() => mutate(`source-${source.id}`, `/api/admin/sources/${source.id}`, { action: source.enabled ? "pause" : "resume" })}>{source.enabled ? <Pause size={15} /> : <Play size={15} />}{source.enabled ? "暂停" : "启用"}</button>
                      <button className="button-secondary !min-h-9 !px-3" disabled={busy !== null} onClick={() => mutate(`retry-${source.id}`, `/api/admin/sources/${source.id}`, { action: "retry" })}><ArrowClockwise size={15} />重试</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <section>
          <h2 className="text-xl font-semibold tracking-[-0.03em]">待审核</h2>
          <div className="mt-4 space-y-3">
            {data.reviews.length ? data.reviews.map((review) => {
              const payload = (review.payload ?? {}) as Record<string, unknown>;
              return <article key={review.id} className="rounded-[1.15rem] bg-surface p-5 ring-1 ring-border/70">
                <div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{String(payload.title ?? payload.company ?? "候选招聘页")}</p><p className="mt-2 text-sm leading-6 text-muted">{review.reason}</p>{payload.url ? <a className="mt-2 block truncate text-xs text-accent" href={String(payload.url)} target="_blank" rel="noreferrer">{String(payload.url)}</a> : null}</div><span className="font-mono text-xs text-muted">{Math.round(Number(review.confidence ?? 0) * 100)}%</span></div>
                <div className="mt-4 flex gap-2"><button className="button-primary !min-h-9 !px-3" disabled={busy !== null} onClick={() => mutate(`approve-${review.id}`, `/api/admin/review-items/${review.id}`, { action: "approve" })}><CheckCircle size={15} />批准</button><button className="button-secondary !min-h-9 !px-3" disabled={busy !== null} onClick={() => mutate(`reject-${review.id}`, `/api/admin/review-items/${review.id}`, { action: "reject" })}><XCircle size={15} />拒绝</button></div>
              </article>;
            }) : <p className="rounded-[1.15rem] bg-surface p-5 text-sm text-muted ring-1 ring-border/70">当前没有待审核记录。</p>}
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold tracking-[-0.03em]">最近运行</h2>
          <div className="mt-4 overflow-hidden rounded-[1.15rem] bg-surface ring-1 ring-border/70">
            {data.runs.slice(0, 12).map((run) => <div key={run.id} className="flex items-start gap-3 border-b border-border/70 p-4 last:border-0"><Clock size={18} className={run.status === "failed" ? "text-warning" : "text-accent"} /><div className="min-w-0"><p className="text-sm font-semibold">{run.status} · 抓取 {run.fetched} / 新增 {run.created} / 更新 {run.updated}</p><p className="mt-1 text-xs text-muted">{formatTime(run.started_at)}</p>{run.error ? <p className="mt-1 truncate text-xs text-warning">{run.error}</p> : null}</div></div>)}
          </div>
        </section>
      </div>
    </div>
  );
}


import type { Metadata } from "next";
import {
  ArrowClockwise,
  CheckCircle,
  Clock,
  Database,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { demoJobs } from "@/data/demo-jobs";
import { isConfigured } from "@/lib/utils";

export const metadata: Metadata = {
  title: "数据状态",
};

const sources = [
  {
    name: "xixicc2027",
    kind: "JSON",
    status: "正常",
    schedule: "每 6 小时",
    records: demoJobs.length,
  },
  {
    name: "企业招聘官网",
    kind: "HTML / Sitemap",
    status: "等待配置",
    schedule: "每 6 小时",
    records: 0,
  },
  {
    name: "公开网页发现",
    kind: "Web Search",
    status: "等待配置",
    schedule: "每天",
    records: 0,
  },
];

export default function AdminPage() {
  const configured = isConfigured();
  return (
    <div className="page-shell py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            数据运行状态
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            查看来源健康、同步结果和需要人工确认的记录。
          </p>
        </div>
        <button
          type="button"
          disabled={!configured}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ArrowClockwise size={18} weight="bold" aria-hidden="true" />
          立即同步
        </button>
      </div>

      {!configured ? (
        <div className="mt-7 flex gap-3 rounded-2xl bg-warning-soft p-4 text-sm text-warning">
          <WarningCircle size={20} weight="fill" className="shrink-0" />
          <p className="leading-6">
            当前为本地演示状态。填写 Supabase、OpenAI 与任务密钥后会启用真实同步和审核操作。
          </p>
        </div>
      ) : null}

      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["已发布岗位", String(demoJobs.length), Database],
          ["健康来源", "1 / 3", CheckCircle],
          ["待人工确认", "0", WarningCircle],
          ["最近同步", "演示数据", Clock],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-2xl border bg-surface p-5">
            <Icon size={22} weight="duotone" className="text-accent" />
            <dt className="mt-5 text-xs text-muted">{String(label)}</dt>
            <dd className="mt-1 font-mono text-xl font-semibold">{String(value)}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">数据源</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-surface-muted text-xs text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">名称</th>
                  <th className="px-5 py-3 font-semibold">类型</th>
                  <th className="px-5 py-3 font-semibold">状态</th>
                  <th className="px-5 py-3 font-semibold">计划</th>
                  <th className="px-5 py-3 text-right font-semibold">记录</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.name} className="border-t">
                    <td className="px-5 py-4 font-semibold">{source.name}</td>
                    <td className="px-5 py-4 text-muted">{source.kind}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          source.status === "正常"
                            ? "bg-accent-soft text-accent"
                            : "bg-warning-soft text-warning"
                        }`}
                      >
                        {source.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted">{source.schedule}</td>
                    <td className="px-5 py-4 text-right font-mono">{source.records}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

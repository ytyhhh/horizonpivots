import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck,
  ChartDonut,
  CheckCircle,
  FileArrowUp,
  MapPin,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { JobCard } from "@/components/job-card";
import { ArrowLink, SectionHeading } from "@/components/ui";
import { getJobs } from "@/lib/jobs";
import { daysUntil } from "@/lib/utils";

const industries = [
  { name: "互联网", detail: "AI、软件、产品与数据", icon: ChartDonut },
  { name: "半导体/硬件", detail: "芯片、嵌入式与机器人", icon: Sparkle },
  { name: "央国企", detail: "总部、研究院与技术岗", icon: CheckCircle },
  { name: "新能源车企", detail: "智驾、电子与研发", icon: MapPin },
];

export default async function Home() {
  const jobs = await getJobs({});
  const latest = jobs.slice(0, 4);
  const urgent = jobs
    .filter((job) => {
      const days = daysUntil(job.deadline, new Date("2026-07-30T12:00:00+08:00"));
      return days !== null && days >= 0 && days <= 30;
    })
    .slice(0, 3);

  return (
    <>
      <section className="page-shell grid min-h-[calc(100dvh-4rem)] items-center gap-12 py-14 lg:grid-cols-[1.02fr_.98fr] lg:py-18">
        <div>
          <p className="inline-flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            公开渠道持续更新
          </p>
          <h1 className="text-balance mt-6 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
            把分散的招聘信息，
            <span className="text-accent">变成你的机会清单。</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
            聚合 2027 届秋招与全年级实习，上传简历即可获得有依据的岗位推荐。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/jobs"
              className="tactile inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong"
            >
              浏览最新岗位
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>
            <Link
              href="/profile"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border bg-surface px-5 text-sm font-semibold text-foreground hover:border-border-strong"
            >
              <FileArrowUp size={18} weight="bold" aria-hidden="true" />
              上传简历匹配
            </Link>
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t pt-6">
            <div>
              <dt className="text-xs text-subtle">当前可浏览</dt>
              <dd className="mt-1 font-mono text-xl font-semibold">{jobs.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-subtle">覆盖方向</dt>
              <dd className="mt-1 font-mono text-xl font-semibold">14</dd>
            </div>
            <div>
              <dt className="text-xs text-subtle">同步频率</dt>
              <dd className="mt-1 font-mono text-xl font-semibold">6h</dd>
            </div>
          </dl>
        </div>

        <div className="relative">
          <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-accent-soft/65 blur-2xl" />
          <div className="rounded-[1.6rem] border bg-surface p-4 card-shadow sm:p-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-sm font-semibold">今天值得关注</p>
                <p className="mt-1 text-xs text-muted">根据收录时间与截止日期整理</p>
              </div>
              <CalendarCheck size={24} weight="duotone" className="text-accent" />
            </div>
            <div className="mt-4 grid gap-3">
              {latest.slice(0, 3).map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="group rounded-2xl bg-surface-muted p-4 hover:bg-surface-strong"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted">{job.company}</p>
                      <p className="mt-1 font-semibold tracking-[-0.02em]">{job.title}</p>
                    </div>
                    <ArrowRight
                      size={17}
                      weight="bold"
                      className="mt-1 shrink-0 text-subtle group-hover:text-accent"
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    {job.locations.slice(0, 3).join(" / ")} · {job.type}
                  </p>
                </Link>
              ))}
            </div>
            <Link
              href="/jobs"
              className="mt-4 flex h-11 items-center justify-center rounded-xl border text-sm font-semibold text-muted hover:border-border-strong hover:text-foreground"
            >
              查看全部岗位
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y bg-surface py-20">
        <div className="page-shell">
          <SectionHeading
            title="刚刚收录"
            description="新岗位优先展示，重复信息已合并。"
            action={<ArrowLink href="/jobs">进入岗位库</ArrowLink>}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {latest.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-20">
        <SectionHeading
          title="按方向发现机会"
          description="从你关心的行业开始，减少无效浏览。"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_.8fr_1fr_1fr]">
          {industries.map(({ name, detail, icon: Icon }, index) => (
            <Link
              key={name}
              href={`/jobs?industry=${encodeURIComponent(name)}`}
              className={`group min-h-44 rounded-2xl border p-5 ${
                index === 0 ? "bg-accent text-white" : "bg-surface"
              }`}
            >
              <Icon
                size={26}
                weight="duotone"
                className={index === 0 ? "text-white" : "text-accent"}
                aria-hidden="true"
              />
              <h3 className="mt-8 text-lg font-semibold">{name}</h3>
              <p
                className={`mt-2 text-sm ${
                  index === 0 ? "text-white/75" : "text-muted"
                }`}
              >
                {detail}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {urgent.length ? (
        <section className="page-shell pb-20">
          <div className="rounded-[1.6rem] bg-foreground p-6 text-background sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
              <div>
                <Briefcase size={28} weight="duotone" className="text-accent" />
                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">
                  别错过截止日期
                </h2>
                <p className="mt-3 text-sm leading-6 opacity-65">
                  这些岗位将在 30 天内截止。申请前请再次核对招聘方页面。
                </p>
              </div>
              <div className="grid gap-2">
                {urgent.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl bg-background/8 px-4 py-3 hover:bg-background/12"
                  >
                    <div>
                      <p className="text-xs opacity-60">{job.company}</p>
                      <p className="mt-1 text-sm font-semibold">{job.title}</p>
                    </div>
                    <p className="shrink-0 font-mono text-xs opacity-70">
                      {daysUntil(
                        job.deadline,
                        new Date("2026-07-30T12:00:00+08:00"),
                      )}{" "}
                      天
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

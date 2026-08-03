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
import { daysUntil, formatDate } from "@/lib/utils";

const industries = [
  { name: "互联网", detail: "AI、软件、产品与数据", icon: ChartDonut, count: "01" },
  { name: "半导体/硬件", detail: "芯片、嵌入式与机器人", icon: Sparkle, count: "02" },
  { name: "央国企", detail: "总部、研究院与技术岗", icon: CheckCircle, count: "03" },
  { name: "新能源车企", detail: "智驾、电子与研发", icon: MapPin, count: "04" },
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
      <section className="page-shell grid items-center gap-10 pb-16 pt-8 lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-[1.04fr_.96fr] lg:gap-16 lg:pb-20 lg:pt-6">
        <div>
          <p data-hero className="eyebrow">
            公开渠道持续更新
          </p>
          <h1 data-hero className="page-title mt-7 max-w-[12ch]">
            让每一次投递，
            <span className="text-accent">更接近机会。</span>
          </h1>
          <p data-hero className="text-pretty mt-7 max-w-[34rem] text-base leading-7 text-muted sm:text-lg">
            聚合 2027 届秋招与全年级实习，把分散的信息、截止日期和匹配依据整理在同一处。
          </p>
          <div data-hero className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/jobs" className="button-primary group">
              浏览最新岗位
              <span className="button-orb">
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </span>
            </Link>
            <Link href="/profile" className="button-secondary group">
              上传简历匹配
              <span className="button-orb">
                <FileArrowUp size={16} weight="bold" aria-hidden="true" />
              </span>
            </Link>
          </div>
          <dl data-hero className="mt-11 grid max-w-xl grid-cols-3 border-t border-border/70 pt-5">
            <div>
              <dt className="text-[11px] text-subtle">当前可浏览</dt>
              <dd
                data-count={jobs.length}
                className="mt-1 font-mono text-xl font-semibold tabular-nums sm:text-2xl"
              >
                {jobs.length.toLocaleString("zh-CN")}
              </dd>
            </div>
            <div className="border-l border-border/70 pl-5">
              <dt className="text-[11px] text-subtle">覆盖方向</dt>
              <dd data-count="14" className="mt-1 font-mono text-xl font-semibold tabular-nums sm:text-2xl">
                14
              </dd>
            </div>
            <div className="border-l border-border/70 pl-5">
              <dt className="text-[11px] text-subtle">同步频率</dt>
              <dd className="mt-1 font-mono text-xl font-semibold tabular-nums sm:text-2xl">6h</dd>
            </div>
          </dl>
        </div>

        <div data-hero className="panel-shell soft-shadow lg:translate-y-4">
          <div className="panel-core overflow-hidden p-4 sm:p-5">
            <div className="relative min-h-44 overflow-hidden rounded-[1rem] bg-foreground p-5 text-background">
              <div className="absolute -right-12 -top-20 size-72">
                {["inset-0", "inset-8", "inset-16"].map((position) => (
                  <span
                    key={position}
                    data-radar-ring
                    className={`absolute ${position} rounded-full border border-background/20`}
                  />
                ))}
                <span className="absolute inset-[7rem] rounded-full bg-accent shadow-[0_0_36px_var(--accent)]" />
              </div>
              <div className="relative z-10 flex h-full min-h-34 flex-col justify-between">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] opacity-65">
                  <span className="size-1.5 rounded-full bg-accent" />
                  RADAR LIVE
                </div>
                <div>
                  <p className="font-mono text-4xl font-semibold tabular-nums">{jobs.length}</p>
                  <p className="mt-1 text-xs opacity-60">个公开岗位正在追踪</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 pb-3 pt-5">
              <div>
                <p className="text-sm font-semibold">今日机会流</p>
                <p className="mt-1 text-xs text-muted">按最近收录整理</p>
              </div>
              <CalendarCheck size={22} weight="duotone" className="text-accent" />
            </div>
            <div className="divide-y divide-border/65">
              {latest.slice(0, 3).map((job, index) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="group grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-1 py-3.5"
                >
                  <span className="font-mono text-[10px] text-subtle">0{index + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-muted">{job.company}</span>
                    <span className="mt-0.5 block truncate text-sm font-semibold">{job.title}</span>
                  </span>
                  <ArrowRight
                    size={15}
                    weight="bold"
                    className="text-subtle transition-transform duration-500 group-hover:translate-x-1 group-hover:text-accent"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section data-reveal className="bg-surface py-18 sm:py-22">
        <div className="page-shell">
          <SectionHeading
            title="刚刚收录"
            description="新岗位优先展示，重复信息已合并。"
            action={<ArrowLink href="/jobs">进入岗位库</ArrowLink>}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {latest.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="page-shell py-20 sm:py-28">
        <SectionHeading
          title="按方向发现机会"
          description="从关心的行业开始，减少无效浏览。"
        />
        <div className="grid gap-px overflow-hidden rounded-[1.4rem] bg-border sm:grid-cols-2 lg:grid-cols-[1.2fr_.8fr_1fr_1fr]">
          {industries.map(({ name, detail, icon: Icon, count }, index) => (
            <Link
              key={name}
              href={`/jobs?industry=${encodeURIComponent(name)}`}
              className={`group min-h-48 p-5 sm:p-6 ${
                index === 0 ? "bg-accent text-white" : "bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon
                  size={24}
                  weight="duotone"
                  className={index === 0 ? "text-white" : "text-accent"}
                  aria-hidden="true"
                />
                <span className={`font-mono text-[10px] ${index === 0 ? "text-white/55" : "text-subtle"}`}>
                  {count}
                </span>
              </div>
              <h3 className="mt-12 text-lg font-semibold tracking-[-0.025em]">{name}</h3>
              <p className={`mt-2 text-sm ${index === 0 ? "text-white/70" : "text-muted"}`}>
                {detail}
              </p>
              <ArrowRight
                size={16}
                weight="bold"
                className="mt-5 transition-transform duration-500 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>

      {urgent.length ? (
        <section data-reveal className="page-shell pb-8">
          <div className="grid overflow-hidden rounded-[1.5rem] bg-accent text-white lg:grid-cols-[.72fr_1.28fr]">
            <div className="p-6 sm:p-8 lg:p-10">
              <Briefcase size={27} weight="duotone" />
              <p className="mt-10 text-[10px] font-semibold tracking-[0.15em] text-white/60">DEADLINE WATCH</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">
                别错过截止日期
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                这些岗位将在 30 天内截止。申请前请再次核对招聘方页面。
              </p>
            </div>
            <div className="divide-y divide-white/12 bg-black/8 px-5 sm:px-7">
              {urgent.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="group flex min-h-24 items-center justify-between gap-5 py-5"
                >
                  <div>
                    <p className="text-xs text-white/60">{job.company}</p>
                    <p className="mt-1 text-sm font-semibold sm:text-base">{job.title}</p>
                    <p className="mt-2 text-[11px] text-white/50">{formatDate(job.deadline)}</p>
                  </div>
                  <span className="font-mono text-xs text-white/75">
                    {daysUntil(job.deadline, new Date("2026-07-30T12:00:00+08:00"))} 天
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

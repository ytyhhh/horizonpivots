import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  CalendarCheck,
  CheckCircle,
  ChartDonut,
  FileArrowUp,
  MapPin,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { ArrowLink } from "@/components/ui";
import { getJobs } from "@/lib/jobs";
import { daysUntil, formatDate } from "@/lib/utils";
import type { Job } from "@/types";

export const dynamic = "force-dynamic";

const industries = [
  { name: "互联网", detail: "AI、软件、产品与数据", icon: ChartDonut, count: "01" },
  { name: "半导体 / 硬件", detail: "芯片、嵌入式与机器人", icon: Sparkle, count: "02" },
  { name: "央国企", detail: "总部、研究院与技术岗位", icon: CheckCircle, count: "03" },
  { name: "新能源车企", detail: "智驾、电子与研发", icon: MapPin, count: "04" },
];

const coverStyles = ["signal-green", "signal-blue", "signal-rust", "signal-sand"];

function EditorialJobTile({ job, index }: { job: Job; index: number }) {
  return (
    <Link href={`/jobs/${job.id}`} className="editorial-job group" data-job-tile>
      <div className={`job-cover ${coverStyles[index % coverStyles.length]}`}>
        <span className="job-cover-index">0{index + 1}</span>
        <span className="job-cover-company">{job.company.slice(0, 8)}</span>
        <span className="job-cover-orbit" aria-hidden="true" />
        <span className="job-cover-type">{job.type}</span>
      </div>
      <div className="job-caption">
        <div>
          <p>{job.company}</p>
          <h3>{job.title}</h3>
        </div>
        <div className="job-caption-meta">
          <span>{job.locations.slice(0, 2).join(" / ") || "地点待确认"}</span>
          <span>{job.industry}</span>
          <ArrowUpRight size={17} weight="bold" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  const jobs = await getJobs({});
  const latest = jobs.slice(0, 4);
  const urgent = jobs
    .filter((job) => {
      const days = daysUntil(job.deadline);
      return days !== null && days >= 0 && days <= 30;
    })
    .slice(0, 4);

  return (
    <>
      <section className="reform-hero">
        <div className="page-shell hero-meta" data-hero>
          <span>EST. 2026</span>
          <span className="hero-meta-center">公开渠道持续更新</span>
          <span className="hidden sm:inline">秋招 · 春招 · 实习</span>
        </div>

        <div className="hero-word-stage" aria-label="校招雷达">
          <p className="hero-word hero-word-left" data-hero-word>校招</p>
          <div className="hero-radar-tile" data-hero-tile>
            <span className="radar-cross radar-cross-x" />
            <span className="radar-cross radar-cross-y" />
            <span className="radar-sweep" />
            <span className="radar-core" />
          </div>
          <p className="hero-word hero-word-right" data-hero-word>雷达</p>
        </div>

        <div className="page-shell hero-lower">
          <div data-hero className="hero-statement">
            <h1>把分散的招聘信息，<br />变成清晰的下一步。</h1>
            <p>
              聚合 2027 届校招与全年级实习，整理截止日期、岗位来源与匹配依据。
            </p>
          </div>
          <div data-hero className="hero-actions">
            <Link href="/jobs" className="reform-button reform-button-dark">
              浏览最新岗位 <ArrowUpRight size={18} weight="bold" />
            </Link>
            <Link href="/profile" className="reform-text-link">
              <FileArrowUp size={18} weight="bold" /> 上传简历匹配
            </Link>
          </div>
        </div>

        <div className="hero-data-rail" data-hero>
          <div className="page-shell hero-data-grid">
            <div><span>正在追踪</span><strong data-count={jobs.length}>{jobs.length}</strong><small>个岗位</small></div>
            <div><span>覆盖方向</span><strong data-count="14">14</strong><small>个行业方向</small></div>
            <div><span>同步频率</span><strong>6H</strong><small>持续核验</small></div>
            <a href="#latest"><span>向下浏览</span><ArrowDown size={23} weight="bold" /></a>
          </div>
        </div>
      </section>

      <section id="latest" className="editorial-section page-shell" data-reveal>
        <div className="editorial-heading">
          <p className="editorial-kicker">01 / Featured opportunities</p>
          <h2>最新收录<br /><em>机会</em></h2>
          <div>
            <p>岗位按最近收录排序，重复信息已自动合并。</p>
            <ArrowLink href="/jobs">查看全部岗位</ArrowLink>
          </div>
        </div>
        <div className="editorial-job-grid">
          {latest.map((job, index) => (
            <EditorialJobTile key={job.id} job={job} index={index} />
          ))}
        </div>
      </section>

      <section className="index-section" data-reveal>
        <div className="page-shell">
          <div className="index-intro">
            <p>02 / Opportunity index</p>
            <h2>从方向开始，<br />减少无效浏览。</h2>
          </div>
          <div className="industry-index">
            {industries.map(({ name, detail, icon: Icon, count }) => (
              <Link key={name} href={`/jobs?industry=${encodeURIComponent(name)}`} className="industry-row group">
                <span className="industry-number">{count}</span>
                <Icon size={25} weight="duotone" aria-hidden="true" />
                <span className="industry-name">{name}</span>
                <span className="industry-detail">{detail}</span>
                <span className="industry-arrow"><ArrowRight size={19} weight="bold" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="deadline-section page-shell" data-reveal>
        <div className="deadline-lead">
          <div>
            <CalendarCheck size={28} weight="duotone" />
            <p>03 / Deadline watch</p>
          </div>
          <h2>别让好机会，<br />停在截止日期之后。</h2>
          <p>这些岗位将在 30 天内截止。投递前请再次核对招聘方页面。</p>
        </div>
        <div className="deadline-list">
          {urgent.length ? urgent.map((job) => {
            const days = daysUntil(job.deadline);
            return (
              <Link key={job.id} href={`/jobs/${job.id}`} className="deadline-row group">
                <span>{job.company}</span>
                <strong>{job.title}</strong>
                <small>{formatDate(job.deadline)}</small>
                <b>{days} DAYS</b>
                <ArrowUpRight size={18} weight="bold" />
              </Link>
            );
          }) : (
            <div className="deadline-empty">
              <Briefcase size={24} weight="duotone" />
              <p>目前没有 30 天内截止的岗位，最新机会仍在持续核验。</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

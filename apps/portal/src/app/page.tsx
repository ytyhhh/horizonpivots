import Image from "next/image";
import { ArrowUpRight, BookOpenText, Compass, GraduationCap } from "@phosphor-icons/react/dist/ssr";
import { platformOrigins } from "@horizon/platform";
import { PortalHeader } from "@/components/portal-header";

export default function PortalHome() {
  return (
    <main>
      <PortalHeader />

      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">Horizon Pivots</p>
          <h1>为每一个重要决定，<br />整理好下一步。</h1>
          <p className="hero-summary">把求职、研究申请与校园生活放进清晰的工作区，再从容推进。</p>
          <div className="hero-actions">
            <a className="button-primary" href={platformOrigins.jobs}>进入校招雷达 <ArrowUpRight size={18} weight="bold" aria-hidden="true" /></a>
            <a className="button-secondary" href={platformOrigins.phd}>进入 PhD Scope</a>
          </div>
        </div>
        <div className="hero-image-wrap">
          <Image src="/horizon-pivots-routes-v2.png" alt="一条路线在远方分成职业与研究两条路径" fill priority sizes="(max-width: 900px) 100vw, 56vw" className="hero-image" />
        </div>
      </section>

      <section className="product-section" aria-labelledby="products-title">
        <div className="section-intro">
          <p className="kicker">同一个账号，三个公开工作区</p>
          <h2 id="products-title">选择一条正在推进的路径。</h2>
          <p>身份验证共享，求职与研究申请资料则分别保存在对应工作区。</p>
        </div>
        <div className="product-grid">
          <a className="product-tile jobs-tile" href={platformOrigins.jobs}>
            <Compass size={31} weight="duotone" aria-hidden="true" />
            <div><span>校招雷达</span><strong>把值得投递的岗位放在一起</strong></div>
            <ArrowUpRight size={22} weight="bold" aria-hidden="true" />
          </a>
          <a className="product-tile phd-tile" href={platformOrigins.phd}>
            <GraduationCap size={31} weight="duotone" aria-hidden="true" />
            <div><span>PhD Scope</span><strong>从目标院校开始梳理研究方向</strong></div>
            <ArrowUpRight size={22} weight="bold" aria-hidden="true" />
          </a>
          <a className="product-tile cuhksz-tile" href={platformOrigins.cuhksz}>
            <BookOpenText size={31} weight="duotone" aria-hidden="true" />
            <div><span>港中声</span><strong>从真实评价开始选课和吃饭</strong></div>
            <ArrowUpRight size={22} weight="bold" aria-hidden="true" />
          </a>
        </div>
      </section>

      <footer className="portal-footer">
        <span>Horizon Pivots</span>
        <div><a href={platformOrigins.jobs}>校招雷达</a><a href={platformOrigins.phd}>PhD Scope</a><a href={platformOrigins.cuhksz}>港中声</a></div>
      </footer>
    </main>
  );
}

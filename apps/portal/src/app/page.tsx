import Image from "next/image";
import { ArrowUpRight, Compass, GraduationCap } from "@phosphor-icons/react/dist/ssr";
import { platformOrigins } from "@horizon/platform";
import { PortalHeader } from "@/components/portal-header";

export default function PortalHome() {
  return (
    <main>
      <PortalHeader />

      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">Horizon Pivots</p>
          <h1>把下一步，<br />放进清晰的视野。</h1>
          <p className="hero-summary">为求职和博士申请整理信息、比较选择，并保留属于你的工作进度。</p>
          <div className="hero-actions">
            <a className="button-primary" href={platformOrigins.jobs}>查看岗位 <ArrowUpRight size={18} weight="bold" aria-hidden="true" /></a>
            <a className="button-secondary" href={platformOrigins.phd}>探索导师</a>
          </div>
        </div>
        <div className="hero-image-wrap">
          <Image src="/horizon-pivots-routes.png" alt="连接职业机会与研究方向的纸质路线图" fill priority sizes="(max-width: 900px) 100vw, 56vw" className="hero-image" />
        </div>
      </section>

      <section className="product-section" aria-labelledby="products-title">
        <div className="section-intro">
          <p className="kicker">两个产品，一个账号</p>
          <h2 id="products-title">从机会，到研究方向。</h2>
          <p>切换产品时无需重新登录。个人资料按使用场景分开保存。</p>
        </div>
        <div className="product-grid">
          <a className="product-tile jobs-tile" href={platformOrigins.jobs}>
            <Compass size={31} weight="duotone" aria-hidden="true" />
            <div><span>校招雷达</span><strong>持续核验校招与实习机会</strong></div>
            <ArrowUpRight size={22} weight="bold" aria-hidden="true" />
          </a>
          <a className="product-tile phd-tile" href={platformOrigins.phd}>
            <GraduationCap size={31} weight="duotone" aria-hidden="true" />
            <div><span>PhD Scope</span><strong>在目标院校范围内寻找导师</strong></div>
            <ArrowUpRight size={22} weight="bold" aria-hidden="true" />
          </a>
        </div>
      </section>

      <footer className="portal-footer">
        <span>Horizon Pivots</span>
        <div><a href={platformOrigins.jobs}>校招雷达</a><a href={platformOrigins.phd}>PhD Scope</a></div>
      </footer>
    </main>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpenText, Compass, GraduationCap, LockKey } from "@phosphor-icons/react/dist/ssr";
import { PortalAuth } from "@/components/portal-auth";

export const metadata = { title: "登录 | Horizon Pivots" };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <header className="auth-masthead">
        <Link href="/" className="auth-wordmark">Horizon Pivots</Link>
        <Link href="/" className="auth-back"><ArrowLeft size={16} weight="bold" aria-hidden="true" /> 返回产品门户</Link>
      </header>
      <section className="auth-layout">
        <aside className="auth-intro" aria-labelledby="auth-title">
          <p className="auth-eyebrow">Horizon Pivots 账号</p>
          <h1 id="auth-title">继续走向<br />你想去的地方。</h1>
          <p className="auth-lede">一个账号连接求职、研究申请与校园生活。每个工作区的资料始终彼此独立。</p>
          <div className="auth-workspaces" aria-label="可使用的产品">
            <div><Compass size={20} weight="duotone" aria-hidden="true" /><span><strong>校招雷达</strong><small>整理值得投递的机会</small></span></div>
            <div><GraduationCap size={20} weight="duotone" aria-hidden="true" /><span><strong>PhD Scope</strong><small>梳理研究申请的下一步</small></span></div>
            <div><BookOpenText size={20} weight="duotone" aria-hidden="true" /><span><strong>港中声</strong><small>查看真实课程与食堂评价</small></span></div>
          </div>
        </aside>
        <section className="auth-card" aria-labelledby="sign-in-title">
          <div className="auth-card-heading">
            <span className="auth-icon"><LockKey size={22} weight="duotone" aria-hidden="true" /></span>
            <div>
              <p className="auth-eyebrow">安全登录</p>
              <h2 id="sign-in-title">欢迎回来</h2>
            </div>
          </div>
          <p className="auth-card-copy">使用你的 Horizon Pivots 账号继续。登录后会自动回到你刚才访问的页面。</p>
          <Suspense fallback={<div className="auth-loading">正在加载登录方式…</div>}>
            <PortalAuth mode="sign-in" />
          </Suspense>
        </section>
      </section>
    </main>
  );
}

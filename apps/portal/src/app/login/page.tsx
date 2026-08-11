import { Suspense } from "react";
import Link from "next/link";
import { LockKey, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { PortalAuth } from "@/components/portal-auth";

export const metadata = { title: "登录 | Horizon Pivots" };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-wordmark">Horizon Pivots</Link>
      <section className="auth-layout">
        <div className="auth-intro">
          <p className="kicker">One account, two workspaces</p>
          <span className="auth-icon"><ShieldCheck size={27} weight="duotone" aria-hidden="true" /></span>
          <h1>一个账号，<br />继续你的下一步。</h1>
          <p>登录后可回到校招雷达或 PhD Scope。两类个人资料始终独立保存。</p>
        </div>
        <div className="auth-card">
          <span className="auth-icon"><LockKey size={23} weight="duotone" aria-hidden="true" /></span>
          <h2>登录 Horizon Pivots</h2>
          <p>使用你在账号中心选择的登录方式。</p>
          <Suspense fallback={<div className="auth-loading">正在加载登录方式…</div>}>
            <PortalAuth mode="sign-in" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

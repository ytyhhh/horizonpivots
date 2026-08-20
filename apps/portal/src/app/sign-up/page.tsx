import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "@phosphor-icons/react/dist/ssr";
import { PortalAuth } from "@/components/portal-auth";

export const metadata = { title: "注册 | Horizon Pivots" };

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <header className="auth-masthead">
        <Link href="/" className="auth-wordmark">Horizon Pivots</Link>
        <Link href="/" className="auth-back"><ArrowLeft size={16} weight="bold" aria-hidden="true" /> 返回产品门户</Link>
      </header>
      <section className="auth-layout auth-layout-single">
        <section className="auth-card" aria-labelledby="sign-up-title">
          <div className="auth-card-heading">
            <span className="auth-icon"><UserPlus size={22} weight="duotone" aria-hidden="true" /></span>
            <div>
              <p className="auth-eyebrow">创建账号</p>
              <h1 id="sign-up-title">从这里开始</h1>
            </div>
          </div>
          <p className="auth-card-copy">注册一个账号，即可进入校招雷达、PhD Scope 和港中声，并按产品分别管理资料。</p>
          <Suspense fallback={<div className="auth-loading">正在加载注册方式…</div>}>
            <PortalAuth mode="sign-up" />
          </Suspense>
        </section>
      </section>
    </main>
  );
}

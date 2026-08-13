import { Suspense } from "react";
import Link from "next/link";
import { UserPlus } from "@phosphor-icons/react/dist/ssr";
import { PortalAuth } from "@/components/portal-auth";

export const metadata = { title: "注册 | Horizon Pivots" };

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-wordmark">Horizon Pivots</Link>
      <section className="auth-layout auth-layout-single">
        <div className="auth-card">
          <span className="auth-icon"><UserPlus size={23} weight="duotone" aria-hidden="true" /></span>
          <h1>开始整理下一步</h1>
          <p>一个账号，可进入求职与研究申请两个独立工作区。</p>
          <Suspense fallback={<div className="auth-loading">正在加载注册方式…</div>}>
            <PortalAuth mode="sign-up" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

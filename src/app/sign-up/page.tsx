import type { Metadata } from "next";
import { EmailDomainAuth } from "@/components/email-domain-auth";

export const metadata: Metadata = { title: "注册账号" };

export default function SignUpPage() {
  return (
    <div className="page-shell grid min-h-[calc(100dvh-7rem)] place-items-center py-10">
      <section className="panel-shell w-full max-w-md">
        <div className="panel-core p-6 sm:p-8">
          <p className="eyebrow">Create account</p>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.045em]">建立你的机会清单</h1>
          <div className="mt-7"><EmailDomainAuth mode="sign-up" /></div>
        </div>
      </section>
    </div>
  );
}

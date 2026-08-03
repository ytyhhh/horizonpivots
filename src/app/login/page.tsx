import type { Metadata } from "next";
import { LockKey, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { EmailDomainAuth } from "@/components/email-domain-auth";

export const metadata: Metadata = {
  title: "登录",
};

export default function LoginPage() {
  return (
    <div className="page-shell grid min-h-[calc(100dvh-7rem)] items-center gap-12 py-10 lg:grid-cols-[1.05fr_.95fr]">
      <div className="hidden max-w-xl lg:block" data-hero>
        <p className="eyebrow">Personal workspace</p>
        <span className="mt-8 grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
          <ShieldCheck size={27} weight="duotone" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-[-0.06em]">
          收藏和推荐，
          <br />
          只属于你的账号。
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-muted">
          使用你在账号中心选定的登录方式。我们不会把你的简历原文件长期保存在服务器。
        </p>
      </div>
      <section className="panel-shell mx-auto w-full max-w-md" data-hero>
        <div className="panel-core p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-full bg-surface-muted text-accent">
          <LockKey size={23} weight="duotone" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.035em]">账号登录</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          使用你在账号中心选定的方式登录。
        </p>
        <div className="mt-7 flex justify-center">
          <EmailDomainAuth mode="sign-in" />
        </div>
        <p className="mt-6 border-t pt-5 text-xs leading-5 text-subtle">
          登录即表示你同意仅将结构化求职画像用于本人岗位推荐。
        </p>
        </div>
      </section>
    </div>
  );
}

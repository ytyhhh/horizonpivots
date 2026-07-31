import type { Metadata } from "next";
import { LockKey, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { LoginForm } from "@/components/login-form";
import { isConfigured } from "@/lib/utils";

export const metadata: Metadata = {
  title: "登录",
};

export default function LoginPage() {
  return (
    <div className="page-shell grid min-h-[calc(100dvh-8rem)] items-center py-12 lg:grid-cols-2">
      <div className="hidden max-w-xl lg:block">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
          <ShieldCheck size={27} weight="duotone" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em]">
          收藏和推荐，
          <br />
          只属于你的账号。
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-muted">
          使用邮箱和密码创建账号。我们不会把你的简历原文件长期保存在服务器。
        </p>
      </div>
      <section className="mx-auto w-full max-w-md rounded-[1.6rem] border bg-surface p-6 card-shadow sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-surface-muted text-accent">
          <LockKey size={23} weight="duotone" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.035em]">账号登录</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          注册后请通过确认邮件激活账号；之后使用邮箱和密码登录。
        </p>
        <div className="mt-7">
          <LoginForm configured={isConfigured()} />
        </div>
        <p className="mt-6 border-t pt-5 text-xs leading-5 text-subtle">
          登录即表示你同意仅将结构化求职画像用于本人岗位推荐。
        </p>
      </section>
    </div>
  );
}

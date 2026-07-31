"use client";

import { EnvelopeSimple, LockSimple, SpinnerGap } from "@phosphor-icons/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type AuthMode = "sign-in" | "sign-up";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!configured) {
      setMessage("演示模式无需登录。配置 Supabase 后即可注册账号。");
      return;
    }

    setLoading(true);
    setMessage("");
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setMessage("登录服务暂未配置，请稍后重试。");
      return;
    }

    if (mode === "sign-up") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setLoading(false);
      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        router.push("/profile");
        router.refresh();
      } else {
        setMessage("注册成功。请打开邮箱确认链接后，再返回此处登录。");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage("邮箱或密码不正确。若尚未注册，请切换到“注册账号”。");
    } else {
      router.push("/profile");
      router.refresh();
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 rounded-xl bg-surface-muted p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "sign-in"}
          onClick={() => changeMode("sign-in")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === "sign-in" ? "bg-surface text-foreground shadow-sm" : "text-muted"
          }`}
        >
          登录
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "sign-up"}
          onClick={() => changeMode("sign-up")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === "sign-up" ? "bg-surface text-foreground shadow-sm" : "text-muted"
          }`}
        >
          注册账号
        </button>
      </div>

      <form className="mt-6" onSubmit={submit}>
        <label htmlFor="email" className="text-sm font-semibold">
          邮箱
        </label>
        <div className="relative mt-2">
          <EnvelopeSimple
            size={19}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@university.edu"
            className="h-12 w-full rounded-xl border bg-background pl-11 pr-4 text-sm placeholder:text-subtle"
          />
        </div>

        <label htmlFor="password" className="mt-5 block text-sm font-semibold">
          密码
        </label>
        <div className="relative mt-2">
          <LockSimple
            size={19}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <input
            id="password"
            type="password"
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位"
            className="h-12 w-full rounded-xl border bg-background pl-11 pr-4 text-sm placeholder:text-subtle"
          />
        </div>

        {message ? (
          <p role="status" className="mt-4 text-sm leading-6 text-muted">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {loading ? <SpinnerGap size={18} className="animate-spin" /> : null}
          {mode === "sign-in" ? "登录" : "注册并发送确认邮件"}
        </button>
      </form>
    </>
  );
}

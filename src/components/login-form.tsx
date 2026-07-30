"use client";

import { EnvelopeSimple, SpinnerGap } from "@phosphor-icons/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    if (!configured) {
      setMessage("演示模式无需登录。配置 Supabase 后即可发送验证码。");
      return;
    }
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) setMessage(error.message);
    else {
      setStage("code");
      setMessage("验证码已发送，请检查邮箱。");
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase!.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setLoading(false);
    if (error) setMessage("验证码无效或已过期，请重新获取。");
    else {
      router.push("/profile");
      router.refresh();
    }
  }

  return (
    <form onSubmit={stage === "email" ? sendCode : verifyCode}>
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
          required
          disabled={stage === "code"}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@university.edu"
          className="h-12 w-full rounded-xl border bg-background pl-11 pr-4 text-sm placeholder:text-subtle disabled:opacity-60"
        />
      </div>

      {stage === "code" ? (
        <div className="mt-5">
          <label htmlFor="code" className="text-sm font-semibold">
            六位验证码
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="mt-2 h-12 w-full rounded-xl border bg-background px-4 font-mono text-lg tracking-[0.35em] placeholder:tracking-[0.35em] placeholder:text-subtle"
          />
        </div>
      ) : null}

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
        {stage === "email" ? "获取验证码" : "登录"}
      </button>
      {stage === "code" ? (
        <button
          type="button"
          onClick={() => {
            setStage("email");
            setCode("");
            setMessage("");
          }}
          className="mt-3 w-full rounded-lg py-2 text-xs font-semibold text-muted hover:text-foreground"
        >
          更换邮箱
        </button>
      ) : null}
    </form>
  );
}

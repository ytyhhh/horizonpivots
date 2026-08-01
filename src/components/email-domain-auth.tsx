"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { ArrowRight, EnvelopeSimple, WarningCircle } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";

const allowedDomain = "@link.cuhk.edu.cn";

interface EmailDomainAuthProps {
  mode: "sign-in" | "sign-up";
}

export function EmailDomainAuth({ mode }: EmailDomainAuthProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function continueWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim().toLocaleLowerCase();
    if (!normalized.endsWith(allowedDomain)) {
      setError(`请使用 ${allowedDomain} 邮箱。`);
      return;
    }
    setEmail(normalized);
    setError("");
    setSubmitted(true);
  }

  if (submitted) {
    return mode === "sign-in" ? (
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/sign-up"
        initialValues={{ identifier: email }}
      />
    ) : (
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/login"
        initialValues={{ emailAddress: email }}
      />
    );
  }

  return (
    <form onSubmit={continueWithEmail} className="w-full max-w-sm rounded-2xl border bg-surface p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
        <EnvelopeSimple size={21} weight="duotone" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em]">
        {mode === "sign-in" ? "使用学校邮箱登录" : "使用学校邮箱注册"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        仅限 {allowedDomain} 邮箱使用校招雷达。
      </p>
      <label htmlFor={`${mode}-email`} className="sr-only">
        学校邮箱
      </label>
      <input
        id={`${mode}-email`}
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={`name${allowedDomain}`}
        autoComplete="email"
        required
        className="mt-5 h-11 w-full rounded-xl border bg-background px-3 text-sm placeholder:text-subtle focus:border-accent"
      />
      {error ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-300">
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:opacity-85"
      >
        继续
        <ArrowRight size={17} weight="bold" aria-hidden="true" />
      </button>
    </form>
  );
}

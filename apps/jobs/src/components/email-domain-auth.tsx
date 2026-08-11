"use client";

import { SignIn, SignUp } from "@clerk/nextjs";

interface EmailDomainAuthProps {
  mode: "sign-in" | "sign-up";
}

export function EmailDomainAuth({ mode }: EmailDomainAuthProps) {
  const appearance = {
    variables: {
      colorPrimary: "var(--accent)",
      colorBackground: "var(--surface)",
      colorText: "var(--foreground)",
      colorTextSecondary: "var(--muted)",
      colorInputBackground: "var(--background)",
      colorInputText: "var(--foreground)",
      borderRadius: "0.9rem",
      fontFamily: "var(--font-sans)",
    },
    elements: {
      rootBox: "w-full",
      cardBox: "w-full shadow-none",
      card: "w-full bg-transparent shadow-none p-0",
      footer: "bg-transparent",
      socialButtonsBlockButton: "border-border/75",
      formButtonPrimary: "rounded-full normal-case",
    },
  };

  return mode === "sign-in" ? (
    <SignIn routing="path" path="/login" signUpUrl="/sign-up" appearance={appearance} />
  ) : (
    <SignUp routing="path" path="/sign-up" signInUrl="/login" appearance={appearance} />
  );
}

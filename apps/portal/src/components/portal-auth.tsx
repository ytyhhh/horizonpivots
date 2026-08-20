"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { isAllowedReturnUrl, platformOrigins } from "@horizon/platform";

const appearance = {
  variables: {
    colorPrimary: "var(--accent)",
    colorBackground: "transparent",
    colorText: "var(--ink)",
    colorTextSecondary: "var(--muted)",
    colorInputBackground: "var(--auth-input)",
    colorInputText: "var(--ink)",
    colorNeutral: "var(--line)",
    borderRadius: "0.9rem",
    fontFamily: "var(--font-geist-sans), Arial, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full bg-transparent shadow-none p-0",
    footer: "bg-transparent",
    socialButtonsBlockButton: "border-[var(--line)] bg-transparent hover:bg-[var(--accent-soft)]",
    formButtonPrimary: "rounded-full normal-case shadow-none",
  },
};

export function PortalAuth({ mode }: { mode: "sign-in" | "sign-up" }) {
  const searchParams = useSearchParams();
  const candidate = searchParams.get("redirect_url");
  const redirectUrl = isAllowedReturnUrl(candidate) ? candidate : platformOrigins.portal;

  return mode === "sign-in" ? (
    <SignIn
      routing="path"
      path="/login"
      signUpUrl="/sign-up"
      forceRedirectUrl={redirectUrl}
      appearance={appearance}
    />
  ) : (
    <SignUp
      routing="path"
      path="/sign-up"
      signInUrl="/login"
      forceRedirectUrl={redirectUrl}
      appearance={appearance}
    />
  );
}

"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { isAllowedReturnUrl, platformOrigins } from "@horizon/platform";

const appearance = {
  variables: {
    colorPrimary: "#166847",
    colorBackground: "#f2f5f1",
    colorText: "#17201c",
    colorTextSecondary: "#64706a",
    colorInputBackground: "#ffffff",
    colorInputText: "#17201c",
    borderRadius: "0.9rem",
    fontFamily: "var(--font-geist-sans), Arial, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full bg-transparent shadow-none p-0",
    footer: "bg-transparent",
    socialButtonsBlockButton: "border-[#d5ddd6]",
    formButtonPrimary: "rounded-full normal-case",
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

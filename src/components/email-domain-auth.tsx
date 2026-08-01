"use client";

import { SignIn, SignUp } from "@clerk/nextjs";

interface EmailDomainAuthProps {
  mode: "sign-in" | "sign-up";
}

export function EmailDomainAuth({ mode }: EmailDomainAuthProps) {
  return mode === "sign-in" ? (
    <SignIn routing="path" path="/login" signUpUrl="/sign-up" />
  ) : (
    <SignUp routing="path" path="/sign-up" signInUrl="/login" />
  );
}

import type { Metadata } from "next";
import { EmailDomainAuth } from "@/components/email-domain-auth";

export const metadata: Metadata = { title: "注册账号" };

export default function SignUpPage() {
  return (
    <div className="page-shell grid min-h-[calc(100dvh-8rem)] place-items-center py-12">
      <EmailDomainAuth mode="sign-up" />
    </div>
  );
}

"use client";

import Link from "next/link";
import { SignIn } from "@phosphor-icons/react";
import { UserButton, useAuth } from "@clerk/nextjs";
import { loginUrl, platformOrigins } from "@horizon/platform";
import { ProductSwitcher } from "@horizon/platform/product-switcher";

export function PortalHeader() {
  const { isSignedIn } = useAuth();
  const returnUrl = typeof window === "undefined" ? platformOrigins.portal : window.location.href;

  return (
    <header className="portal-header">
      <Link href="/" className="wordmark" aria-label="Horizon Pivots 首页">Horizon Pivots</Link>
      <ProductSwitcher active="portal" className="portal-product-switcher" />
      {isSignedIn
        ? <UserButton appearance={{ elements: { avatarBox: "size-9" } }} />
        : <a className="login-link" href={loginUrl(returnUrl)}><SignIn size={17} weight="bold" aria-hidden="true" /> 登录</a>}
    </header>
  );
}

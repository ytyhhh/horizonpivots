"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { ArrowLeft, LockKey, SignIn } from "@phosphor-icons/react";
import { loginUrl } from "@horizon/platform";

interface SiteHeaderProps {
  backHref?: string;
  backLabel?: string;
  roomLabel?: string;
  isOwner?: boolean;
}

export function SiteHeader({ backHref, backLabel = "返回", roomLabel, isOwner = false }: SiteHeaderProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const returnUrl = process.env.NEXT_PUBLIC_DP_URL ?? "https://dp.horizonpivots.com";

  return (
    <header className="site-header">
      <div className="site-header__left">
        {backHref ? (
          <Link className="icon-button" href={backHref} aria-label={backLabel} title={backLabel}>
            <ArrowLeft size={19} weight="bold" aria-hidden="true" />
          </Link>
        ) : null}
        <Link className="wordmark" href="/" aria-label="好友牌桌首页">
          <span className="wordmark__mark" aria-hidden="true">HP</span>
          <span>
            <strong>好友牌桌</strong>
            <small>Horizon Pivots</small>
          </span>
        </Link>
      </div>

      {roomLabel ? <span className="room-label">{roomLabel}</span> : null}

      <div className="site-header__right">
        <span className="privacy-chip"><LockKey size={15} weight="fill" aria-hidden="true" /> 仅限受邀</span>
        {isOwner ? <Link className="text-link header-admin-link" href="/admin">管理牌桌</Link> : null}
        {isLoaded && isSignedIn ? (
          <UserButton appearance={{ elements: { avatarBox: "dp-avatar" } }} />
        ) : (
          <a className="icon-button owner-login" href={loginUrl(returnUrl)} aria-label="房主登录" title="房主登录">
            <SignIn size={19} weight="bold" aria-hidden="true" />
          </a>
        )}
      </div>
    </header>
  );
}

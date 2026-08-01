"use client";

import { SignOutButton } from "@clerk/nextjs";
import { SignOut } from "@phosphor-icons/react";

export function AccountActions() {
  return (
    <SignOutButton redirectUrl="/">
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-xl border bg-surface px-3 text-sm font-semibold text-muted hover:border-border-strong hover:text-foreground"
      >
        <SignOut size={18} weight="bold" aria-hidden="true" />
        <span className="hidden sm:inline">退出</span>
      </button>
    </SignOutButton>
  );
}

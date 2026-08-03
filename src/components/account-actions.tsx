"use client";

import { SignOutButton } from "@clerk/nextjs";
import { SignOut } from "@phosphor-icons/react";

export function AccountActions() {
  return (
    <SignOutButton redirectUrl="/">
      <button
        type="button"
        className="secondary-compact-button"
      >
        <SignOut size={18} weight="bold" aria-hidden="true" />
        <span className="hidden sm:inline">退出</span>
      </button>
    </SignOutButton>
  );
}

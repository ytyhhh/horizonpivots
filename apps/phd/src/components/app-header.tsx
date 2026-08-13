"use client";

import { Moon, SignIn, Sun, Translate } from "@phosphor-icons/react";
import { UserButton, useAuth } from "@clerk/nextjs";
import { loginUrl, platformOrigins } from "@horizon/platform";
import { ProductSwitcher } from "@horizon/platform/product-switcher";
import { useAppTheme } from "@/components/app-theme";

export function AppHeader({ locale, onLocaleChange }: { locale: "zh" | "en"; onLocaleChange: () => void }) {
  const { mode, toggle } = useAppTheme();
  const { isSignedIn } = useAuth();

  return (
    <header className="border-b border-[var(--line)] bg-[var(--surface)]/90">
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-[10px] bg-[var(--accent)] text-sm font-bold text-[var(--page)] dark:text-[#10151e]">
            PS
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-[-0.02em]">Horizon Pivots</div>
            <div className="text-xs text-[var(--faint)]">PhD Scope {locale === "zh" ? "研究申请工作区" : "Research application workspace"}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <a className="button-quiet hidden !min-h-9 !px-3 text-sm md:inline-flex" href={platformOrigins.portal}>平台首页</a>
          <ProductSwitcher active="phd" className="platform-switcher hidden md:flex" />
          <button className="button-quiet !min-h-9 !px-3" onClick={onLocaleChange} aria-label="Switch language">
            <Translate size={18} weight="regular" />
            <span className="hidden sm:inline">{locale === "zh" ? "EN" : "中文"}</span>
          </button>
          <button className="button-quiet !min-h-9 !px-3" onClick={toggle} aria-label={mode === "light" ? "Use dark mode" : "Use light mode"}>
            {mode === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {isSignedIn
            ? <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
            : <a className="button-secondary !min-h-9 !px-4" href={loginUrl(platformOrigins.phd)}><SignIn size={18} />{locale === "zh" ? "登录" : "Sign in"}</a>}
        </div>
      </div>
    </header>
  );
}

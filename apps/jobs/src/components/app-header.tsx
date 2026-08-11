import Link from "next/link";
import { ArrowUpRight, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { AccountActions } from "@/components/account-actions";
import { Brand } from "@/components/brand";
import { PrimaryNav } from "@/components/primary-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUserId } from "@/lib/auth";
import { platformOrigins } from "@horizon/platform";

export async function AppHeader() {
  const userId = await getCurrentUserId();

  return (
    <>
      <header data-app-header className="app-header">
        <div className="header-island">
          <div className="page-shell flex items-center justify-between gap-5">
            <Brand compact />
            <nav className="hidden items-center gap-3 text-sm text-muted lg:flex" aria-label="Horizon Pivots 产品">
              <a href={platformOrigins.portal} className="transition-colors hover:text-foreground">Horizon</a>
              <a href={platformOrigins.phd} className="transition-colors hover:text-foreground">PhD Scope</a>
            </nav>
            <PrimaryNav />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href={userId ? "/profile" : "/login"}
                className="account-button group"
              >
                <UserCircle size={18} weight="bold" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {userId ? "我的账号" : "登录"}
                </span>
                <ArrowUpRight
                  size={14}
                  weight="bold"
                  className="hidden transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:block"
                  aria-hidden="true"
                />
              </Link>
              {userId ? <AccountActions /> : null}
            </div>
          </div>
        </div>
      </header>
      <PrimaryNav mobile />
    </>
  );
}

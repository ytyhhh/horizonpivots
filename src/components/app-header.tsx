import Link from "next/link";
import { ArrowUpRight, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { AccountActions } from "@/components/account-actions";
import { Brand } from "@/components/brand";
import { PrimaryNav } from "@/components/primary-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUserId } from "@/lib/auth";

export async function AppHeader() {
  const userId = await getCurrentUserId();

  return (
    <>
      <header data-app-header className="app-header">
        <div className="page-shell">
          <div className="header-island">
            <Brand compact />
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

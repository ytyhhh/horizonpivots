import Link from "next/link";
import { ArrowUpRight, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { AccountActions } from "@/components/account-actions";
import { Brand } from "@/components/brand";
import { PrimaryNav } from "@/components/primary-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUserId } from "@/lib/auth";
import { loginUrl, platformOrigins } from "@horizon/platform";
import { ProductSwitcher } from "@horizon/platform/product-switcher";

export async function AppHeader() {
  const userId = await getCurrentUserId();

  return (
    <>
      <header data-app-header className="app-header">
        <div className="header-island">
          <div className="page-shell flex items-center justify-between gap-5">
            <Brand compact />
            <div className="header-product-switcher hidden items-center lg:flex">
              <a href={platformOrigins.portal}>平台首页</a>
              <ProductSwitcher active="jobs" />
            </div>
            <PrimaryNav />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href={userId ? "/profile" : loginUrl(platformOrigins.jobs)}
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

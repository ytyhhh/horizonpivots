import Link from "next/link";
import {
  BookmarkSimple,
  Briefcase,
  Compass,
  FileText,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { AccountActions } from "@/components/account-actions";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUserId } from "@/lib/auth";

const links = [
  { href: "/jobs", label: "岗位库", icon: Briefcase },
  { href: "/recommendations", label: "为你推荐", icon: Compass },
  { href: "/saved", label: "收藏", icon: BookmarkSimple },
  { href: "/profile", label: "简历画像", icon: FileText },
];

export async function AppHeader() {
  const userId = await getCurrentUserId();

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/92 backdrop-blur-xl">
        <div className="page-shell flex h-16 items-center justify-between gap-5">
          <Brand compact />
          <nav className="hidden items-center gap-1 md:flex" aria-label="主要导航">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-surface-muted hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href={userId ? "/profile" : "/login"}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-3.5 text-sm font-semibold text-background hover:opacity-85"
            >
              <UserCircle size={18} weight="bold" aria-hidden="true" />
              <span className="hidden sm:inline">
                {userId ? "我的账号" : "登录"}
              </span>
            </Link>
            {userId ? <AccountActions /> : null}
          </div>
        </div>
      </header>

      <nav
        aria-label="移动端导航"
        className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-2xl border bg-surface/95 p-1.5 shadow-[0_16px_48px_rgba(16,30,20,.2)] backdrop-blur-xl md:hidden"
      >
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium text-muted hover:bg-surface-muted hover:text-foreground"
          >
            <Icon size={20} weight="bold" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}

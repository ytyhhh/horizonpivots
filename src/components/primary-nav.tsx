"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookmarkSimple,
  Briefcase,
  Compass,
  FileText,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/jobs", label: "岗位库", icon: Briefcase },
  { href: "/recommendations", label: "为你推荐", icon: Compass },
  { href: "/saved", label: "收藏", icon: BookmarkSimple },
  { href: "/profile", label: "简历画像", icon: FileText },
];

export function PrimaryNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return mobile ? (
    <nav aria-label="移动端导航" className="mobile-dock md:hidden">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("mobile-dock-link", active && "is-active")}
          >
            <Icon size={19} weight={active ? "fill" : "regular"} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  ) : (
    <nav className="hidden items-center gap-1 md:flex" aria-label="主要导航">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("nav-link", active && "is-active")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

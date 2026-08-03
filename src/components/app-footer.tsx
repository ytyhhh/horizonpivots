import Link from "next/link";
import { Brand } from "@/components/brand";

export function AppFooter() {
  return (
    <footer className="mt-24 pb-28 md:pb-10">
      <div className="page-shell border-t border-border/70 pt-8">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <Brand />
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted">
              聚合公开招聘信息，帮助学生更快发现适合自己的机会。岗位信息以原始招聘页面为准。
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted md:justify-end">
            <Link href="/jobs" className="hover:text-foreground">
              浏览岗位
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              隐私说明
            </Link>
            <Link href="/admin" className="hover:text-foreground">
              数据状态
            </Link>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5 text-[11px] text-subtle">
          <p>公开渠道持续更新 · 申请信息以招聘方页面为准</p>
          <p className="font-mono tabular-nums">© 2026 CAMPUS RADAR</p>
        </div>
      </div>
    </footer>
  );
}

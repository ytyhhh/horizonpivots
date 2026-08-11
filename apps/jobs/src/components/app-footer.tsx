import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Brand } from "@/components/brand";

export function AppFooter() {
  return (
    <footer className="site-footer mt-24 pb-24 md:pb-0">
      <div className="page-shell py-10 sm:py-14">
        <div className="footer-lead">
          <p>下一份值得投递的工作，</p>
          <Link href="/jobs" className="group">
            从这里开始
            <ArrowUpRight className="footer-arrow" size={28} weight="bold" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-14 grid gap-10 border-t border-white/20 pt-7 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div>
            <Brand />
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/55">
              聚合公开招聘信息，用更清晰的数据帮助学生发现机会。申请前请以招聘方页面为准。
            </p>
          </div>
          <nav aria-label="页脚导航" className="grid grid-cols-3 gap-4 text-sm md:text-right">
            <Link href="/jobs">岗位库</Link>
            <Link href="/privacy">隐私说明</Link>
            <Link href="/admin">数据状态</Link>
          </nav>
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-[10px] tracking-[0.08em] text-white/40">
          <p>PUBLIC SOURCES · CONTINUOUSLY UPDATED</p>
          <p className="font-mono tabular-nums">© 2026 CAMPUS RADAR</p>
        </div>
      </div>
    </footer>
  );
}

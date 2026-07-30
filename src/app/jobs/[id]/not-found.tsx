import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function JobNotFound() {
  return (
    <div className="page-shell py-20">
      <EmptyState
        title="这个岗位已下线或不存在"
        description="招聘信息可能已过期、合并或被招聘方撤回。"
      />
      <div className="mt-5 text-center">
        <Link href="/jobs" className="text-sm font-semibold text-accent">
          返回岗位库
        </Link>
      </div>
    </div>
  );
}

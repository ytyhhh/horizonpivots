"use client";

import Link from "next/link";
import { WarningCircle } from "@phosphor-icons/react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="simple-state">
      <WarningCircle size={39} weight="duotone" aria-hidden="true" />
      <h1>页面暂时没有打开</h1>
      <p>连接可能短暂中断。牌局状态仍保存在服务器上。</p>
      <div><button className="primary-button" type="button" onClick={reset}>重新加载</button><Link className="secondary-button" href="/">返回首页</Link></div>
    </main>
  );
}

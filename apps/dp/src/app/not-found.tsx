import Link from "next/link";
import { LockKey } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <main className="simple-state">
      <LockKey size={39} weight="duotone" aria-hidden="true" />
      <h1>没有找到这个牌桌</h1>
      <p>房间可能已经结束，或牌桌地址已经失效。</p>
      <Link className="primary-button" href="/">使用房间号加入</Link>
    </main>
  );
}

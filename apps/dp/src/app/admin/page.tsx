import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { LockKey } from "@phosphor-icons/react/dist/ssr";
import { loginUrl } from "@horizon/platform";
import { AdminClient } from "@/components/admin-client";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export const metadata = { title: "牌桌管理" };

export default async function AdminPage() {
  const { userId } = await auth();
  const isOwner = Boolean(process.env.DP_OWNER_CLERK_USER_ID && userId === process.env.DP_OWNER_CLERK_USER_ID);

  if (isOwner) return <AdminClient />;

  const returnUrl = `${process.env.NEXT_PUBLIC_DP_URL ?? "https://dp.horizonpivots.com"}/admin`;
  return (
    <main className="admin-page">
      <SiteHeader backHref="/" backLabel="返回首页" />
      <section className="access-denied">
        <LockKey size={38} weight="duotone" aria-hidden="true" />
        <h1>这里仅对房主开放</h1>
        <p>朋友可以直接使用房间号加入牌局，不需要登录。</p>
        <div><a className="primary-button" href={loginUrl(returnUrl)}>房主登录</a><Link className="secondary-button" href="/">返回首页</Link></div>
      </section>
    </main>
  );
}

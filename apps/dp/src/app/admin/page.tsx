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
  if (userId) return <AdminClient />;

  const returnUrl = `${process.env.NEXT_PUBLIC_DP_URL ?? "https://dp.horizonpivots.com"}/admin`;
  return (
    <main className="admin-page">
      <SiteHeader backHref="/" backLabel="返回首页" />
      <section className="access-denied">
        <LockKey size={38} weight="duotone" aria-hidden="true" />
        <h1>登录后管理你的牌桌</h1>
        <p>任何登录用户都可以创建并管理自己的私密房间；受邀朋友仍可凭房间号免登录加入。</p>
        <div><a className="primary-button" href={loginUrl(returnUrl)}>登录开桌</a><Link className="secondary-button" href="/">返回首页</Link></div>
      </section>
    </main>
  );
}

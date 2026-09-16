import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { DeviceMobile, LockKey } from "@phosphor-icons/react/dist/ssr";
import { loginUrl } from "@horizon/platform";
import { MobileConnectClient } from "@/components/mobile-connect-client";
import { SiteHeader } from "@/components/site-header";
import { isMobileCodeChallenge, issueMobileAuthorizationCode } from "@/lib/server/security";

export const dynamic = "force-dynamic";
export const metadata = { title: "连接 Android 房主", robots: { index: false, follow: false } };

type Query = { challenge?: string | string[]; state?: string | string[] };

export default async function MobileConnectPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const challenge = typeof query.challenge === "string" ? query.challenge : "";
  const state = typeof query.state === "string" ? query.state : "";
  const validState = /^[A-Za-z0-9_-]{22,86}$/.test(state);
  const returnUrl = new URL("/mobile/connect", process.env.NEXT_PUBLIC_DP_URL ?? "https://dp.horizonpivots.com");
  returnUrl.searchParams.set("challenge", challenge);
  returnUrl.searchParams.set("state", state);

  if (!isMobileCodeChallenge(challenge) || !validState) {
    return (
      <main className="admin-page">
        <SiteHeader backHref="/" backLabel="返回首页" />
        <section className="access-denied">
          <LockKey size={38} weight="duotone" aria-hidden="true" />
          <h1>这次 App 授权无效</h1>
          <p>请回到好友德扑 App，重新选择“网页登录”。</p>
          <div><Link className="secondary-button" href="/">返回首页</Link></div>
        </section>
      </main>
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return (
      <main className="admin-page">
        <SiteHeader backHref="/" backLabel="返回首页" />
        <section className="access-denied">
          <DeviceMobile size={38} weight="duotone" aria-hidden="true" />
          <h1>登录后连接 Android App</h1>
          <p>登录只在 Horizon Pivots 页面完成。App 不会读取或保存你的账号密码。</p>
          <div><a className="primary-button" href={loginUrl(returnUrl.toString())}>登录并继续</a><Link className="secondary-button" href="/">取消</Link></div>
        </section>
      </main>
    );
  }

  const code = issueMobileAuthorizationCode(userId, challenge);
  const callback = new URL("friendsholdem://auth");
  callback.searchParams.set("code", code);
  callback.searchParams.set("state", state);
  return (
    <main className="admin-page">
      <SiteHeader backHref="/" backLabel="返回首页" isOwner />
      <section className="access-denied">
        <DeviceMobile size={38} weight="duotone" aria-hidden="true" />
        <h1>正在返回好友德扑</h1>
        <p>授权码只在几分钟内有效，并由 App 本机生成的校验值保护。</p>
        <MobileConnectClient callbackUrl={callback.toString()} />
      </section>
    </main>
  );
}

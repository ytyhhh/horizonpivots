import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "geist/font/sans";
import "geist/font/mono";
import "./globals.css";

const canonical = process.env.NEXT_PUBLIC_DP_URL ?? "https://dp.horizonpivots.com";

export const metadata: Metadata = {
  metadataBase: new URL(canonical),
  title: {
    default: "好友牌桌 | Horizon Pivots",
    template: "%s | 好友牌桌",
  },
  description: "只供受邀朋友使用的娱乐德州扑克牌桌。",
  alternates: { canonical },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3f8" },
    { media: "(prefers-color-scheme: dark)", color: "#160d1b" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}

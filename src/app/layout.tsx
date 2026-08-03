import type { Metadata } from "next";
import "geist/font/sans";
import "geist/font/mono";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { MotionRuntime } from "@/components/motion-runtime";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "校招雷达 | 公开渠道持续更新",
    template: "%s | 校招雷达",
  },
  description:
    "聚合 2027 届秋招与全年级实习岗位，根据你的经历和偏好提供可解释的岗位推荐。",
  keywords: ["秋招", "校招", "实习", "2027届", "岗位推荐"],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "校招雷达",
    description: "公开渠道持续更新，找到更适合你的校招和实习岗位。",
  },
};

const themeScript = `
(() => {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.dataset.theme = saved;
    }
  } catch {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-[100dvh] flex-col">
        <ClerkProvider>
          <MotionRuntime />
          <a
            href="#main-content"
            className="fixed left-3 top-3 -translate-y-24 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white focus:translate-y-0"
          >
            跳到主要内容
          </a>
          <AppHeader />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <AppFooter />
        </ClerkProvider>
      </body>
    </html>
  );
}

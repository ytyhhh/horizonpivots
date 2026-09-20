import type { Metadata } from "next";
import "geist/font/sans";
import "geist/font/mono";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { MotionRuntime } from "@/components/motion-runtime";
import { JOBS_ORIGIN, serializeJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(JOBS_ORIGIN),
  applicationName: "校招雷达",
  title: {
    default: "校招雷达 | 公开渠道持续更新",
    template: "%s | 校招雷达",
  },
  description:
    "聚合 2027 届秋招与全年级实习岗位，根据你的经历和偏好提供可解释的岗位推荐。",
  keywords: ["秋招", "校招", "校园招聘", "实习", "2027届", "岗位推荐", "应届生招聘"],
  authors: [{ name: "Horizon Pivots", url: "https://horizonpivots.com" }],
  creator: "Horizon Pivots",
  publisher: "Horizon Pivots",
  category: "招聘",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "校招雷达",
    title: "校招雷达",
    description: "公开渠道持续更新，找到更适合你的校招和实习岗位。",
  },
  twitter: {
    card: "summary",
    title: "校招雷达",
    description: "公开渠道持续更新，找到更适合你的校招和实习岗位。",
  },
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${JOBS_ORIGIN}/#website`,
  url: JOBS_ORIGIN,
  name: "校招雷达",
  alternateName: "Horizon Pivots Jobs",
  description: "聚合并持续核验公开校招、春招和实习岗位。",
  inLanguage: "zh-CN",
  publisher: {
    "@type": "Organization",
    name: "Horizon Pivots",
    url: "https://horizonpivots.com",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteStructuredData) }}
        />
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
        <Analytics />
      </body>
    </html>
  );
}

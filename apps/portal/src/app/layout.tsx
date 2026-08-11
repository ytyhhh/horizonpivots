import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_PLATFORM_URL ?? "https://horizonpivots.com"),
  title: "Horizon Pivots | 为下一步找到更清晰的路径",
  description: "Horizon Pivots 将求职机会与博士申请研究工作区放在同一账号体系中。",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "Horizon Pivots",
    description: "为求职与研究申请提供清晰的下一步。",
  },
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

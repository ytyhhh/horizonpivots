import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { AppTheme } from "@/components/app-theme";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_PHD_URL ?? "https://phd.horizonpivots.com"),
  title: "PhD Scope | 导师匹配与套瓷助手",
  description: "先选择目标学校，再从学校官网与学术数据中寻找研究方向匹配的博士导师。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ClerkProvider>
          <AppTheme>{children}</AppTheme>
        </ClerkProvider>
      </body>
    </html>
  );
}

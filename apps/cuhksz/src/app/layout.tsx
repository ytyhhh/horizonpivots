import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_CUHK_SZ_URL ?? "https://cuhksz.horizonpivots.com"),
  title: "港中深课饭评 | CUHK-Shenzhen Student Voice",
  description: "港中深学生的匿名课程与食堂评价社区。",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "港中深课饭评",
    description: "从真实评价开始选课和吃饭。",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}

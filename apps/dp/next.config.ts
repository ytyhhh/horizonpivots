import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

if (process.env.VERCEL_ENV === "production") {
  const required = [
    "NEXT_PUBLIC_DP_URL",
    "NEXT_PUBLIC_PLATFORM_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "DP_OWNER_CLERK_USER_ID",
    "DP_SESSION_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "DP_DATABASE_ACCESS_KEY",
  ] as const;
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`DP production configuration is incomplete: ${missing.join(", ")}`);
  }
  if ((process.env.DP_SESSION_SECRET?.length ?? 0) < 32) {
    throw new Error("DP_SESSION_SECRET must be at least 32 characters in production.");
  }
  if ((process.env.DP_DATABASE_ACCESS_KEY?.length ?? 0) < 48) {
    throw new Error("DP_DATABASE_ACCESS_KEY must be at least 48 characters in production.");
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@horizon/platform"],
  turbopack: { root: workspaceRoot },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

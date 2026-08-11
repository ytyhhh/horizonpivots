import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

if (process.env.VERCEL_ENV === "production") {
  const required = [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(", ")}`);
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@horizon/platform"],
  turbopack: { root: workspaceRoot },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "@radix-ui/themes"],
  },
};

export default nextConfig;

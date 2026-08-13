import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: workspaceRoot },
  outputFileTracingIncludes: {
    "/*": [
      "./index.html",
      "./styles.css",
      "./config.js",
      "./data.js",
      "./clerk-adapter.js",
      "./supabase-adapter.js",
      "./app.js",
      "./assets/**/*",
    ],
  },
};

export default nextConfig;

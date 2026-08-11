import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@horizon/platform"],
  turbopack: { root: workspaceRoot },
  async redirects() {
    return [{ source: "/:path*", has: [{ type: "host", value: "www.horizonpivots.com" }], destination: "https://horizonpivots.com/:path*", permanent: true }];
  },
};

export default nextConfig;

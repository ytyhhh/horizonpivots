import type { MetadataRoute } from "next";
import { JOBS_ORIGIN } from "@/lib/seo";

const privatePaths = [
  "/admin",
  "/api/",
  "/login",
  "/profile",
  "/recommendations",
  "/saved",
  "/sign-up",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: ["OAI-SearchBot", "ChatGPT-User"],
        allow: ["/", "/jobs/", "/privacy/", "/llms.txt"],
        disallow: privatePaths,
      },
    ],
    sitemap: `${JOBS_ORIGIN}/sitemap.xml`,
    host: JOBS_ORIGIN,
  };
}

import type { MetadataRoute } from "next";
import { getPublicJobIndex } from "@/lib/jobs";
import { JOBS_ORIGIN, jobCanonicalUrl } from "@/lib/seo";

export const revalidate = 3_600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobs = await getPublicJobIndex();

  return [
    {
      url: JOBS_ORIGIN,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${JOBS_ORIGIN}/jobs`,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${JOBS_ORIGIN}/privacy`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    ...jobs.map((job) => ({
      url: jobCanonicalUrl(job.id),
      lastModified: job.lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}

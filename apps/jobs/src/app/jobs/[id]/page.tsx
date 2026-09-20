import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { JobCard, JobDetailPanel } from "@/components/job-card";
import { SectionHeading } from "@/components/ui";
import { getJob, getSimilarJobs } from "@/lib/jobs";
import {
  buildJobStructuredData,
  jobCanonicalUrl,
  jobMetaDescription,
  serializeJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  return job
    ? {
        title: `${job.company} ${job.title}`,
        description: jobMetaDescription(job),
        keywords: [job.company, job.title, job.type, job.cohort, job.industry, ...job.locations, ...job.skills],
        alternates: { canonical: jobCanonicalUrl(job.id) },
        robots: job.cuhkShenzhenOnly
          ? { index: false, follow: false }
          : { index: true, follow: true },
        openGraph: {
          type: "website",
          url: jobCanonicalUrl(job.id),
          title: `${job.company} ${job.title}`,
          description: jobMetaDescription(job),
        },
        twitter: {
          card: "summary",
          title: `${job.company} ${job.title}`,
          description: jobMetaDescription(job),
        },
      }
    : {
        title: "岗位不存在",
        robots: { index: false, follow: false },
      };
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();
  const similar = await getSimilarJobs(job, 3);
  const structuredData = buildJobStructuredData(job);

  return (
    <div className="page-shell pb-12 pt-6 sm:pt-9">
      {!job.cuhkShenzhenOnly ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
      ) : null}
      <Link
        href="/jobs"
        className="mb-6 inline-flex items-center gap-2 rounded-full text-sm font-semibold text-muted hover:text-foreground"
      >
        <ArrowLeft size={17} weight="bold" aria-hidden="true" />
        返回岗位库
      </Link>
      <div className="mx-auto max-w-4xl">
        <JobDetailPanel job={job} />
      </div>

      {similar.length ? (
        <section data-reveal className="mt-18">
          <SectionHeading title="相似岗位" />
          <div className="grid gap-4 md:grid-cols-3">
            {similar.map((item) => (
              <JobCard key={item.id} job={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

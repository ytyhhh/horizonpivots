import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { JobCard, JobDetailPanel } from "@/components/job-card";
import { SectionHeading } from "@/components/ui";
import { getJob, getJobs } from "@/lib/jobs";

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
        description: job.summary,
      }
    : { title: "岗位不存在" };
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [job, jobs] = await Promise.all([getJob(id), getJobs({})]);
  if (!job) notFound();

  const similar = jobs
    .filter(
      (item) =>
        item.id !== job.id &&
        (item.industry === job.industry ||
          item.skills.some((skill) => job.skills.includes(skill))),
    )
    .slice(0, 3);

  return (
    <div className="page-shell py-8 sm:py-12">
      <Link
        href="/jobs"
        className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-muted hover:text-foreground"
      >
        <ArrowLeft size={17} weight="bold" aria-hidden="true" />
        返回岗位库
      </Link>
      <div className="mx-auto max-w-4xl">
        <JobDetailPanel job={job} />
      </div>

      {similar.length ? (
        <section className="mt-16">
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

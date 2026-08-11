import { getJob, getJobs } from "@/lib/jobs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = await getJob(id);
  if (!job) return Response.json({ message: "岗位不存在" }, { status: 404 });
  const jobs = await getJobs({});
  const similar = jobs
    .filter(
      (item) =>
        item.id !== job.id &&
        (item.industry === job.industry ||
          item.skills.some((skill) => job.skills.includes(skill))),
    )
    .slice(0, 5);
  return Response.json({ data: job, similar });
}

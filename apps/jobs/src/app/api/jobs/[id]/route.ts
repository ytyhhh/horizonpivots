import { getJob, getSimilarJobs } from "@/lib/jobs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = await getJob(id);
  if (!job) return Response.json({ message: "岗位不存在" }, { status: 404 });
  const similar = await getSimilarJobs(job, 5);
  return Response.json({ data: job, similar });
}

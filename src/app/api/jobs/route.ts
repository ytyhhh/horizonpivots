import { getJobs } from "@/lib/jobs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    const jobs = await getJobs(Object.fromEntries(params.entries()));
    const limit = Math.min(Number(params.get("limit") ?? 20), 50);
    const cursor = params.get("cursor");
    const start = cursor ? Math.max(0, jobs.findIndex((job) => job.id === cursor) + 1) : 0;
    const data = jobs.slice(start, start + limit);
    return Response.json({
      data,
      nextCursor: start + limit < jobs.length ? data.at(-1)?.id ?? null : null,
      total: jobs.length,
    });
  } catch (error) {
    return Response.json(
      {
        message: "筛选参数无效",
        detail: error instanceof Error ? error.message : undefined,
      },
      { status: 400 },
    );
  }
}

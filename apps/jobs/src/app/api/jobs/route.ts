import { getJobsPage } from "@/lib/jobs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    return Response.json(await getJobsPage(Object.fromEntries(params.entries())));
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

import { isCronAuthorized } from "@/lib/cron-auth";
import { runOfficialIngestionBatch } from "@/lib/ingestion/official-runner";

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return Response.json({ message: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    return Response.json(await runOfficialIngestionBatch(body.limit));
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Official ingestion failed" },
      { status: 502 },
    );
  }
}

export const GET = POST;


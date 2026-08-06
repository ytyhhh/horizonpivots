import { isCronAuthorized } from "@/lib/cron-auth";
import { sendDailyOperationsDigest } from "@/lib/digest";

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return Response.json({ message: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await sendDailyOperationsDigest());
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Digest failed" },
      { status: 502 },
    );
  }
}

export const GET = POST;


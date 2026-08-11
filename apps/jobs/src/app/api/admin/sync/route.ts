import { isAdmin } from "@/lib/auth";
import { runOfficialIngestionBatch } from "@/lib/ingestion/official-runner";

export const maxDuration = 300;

export async function POST() {
  if (!(await isAdmin())) return Response.json({ message: "Forbidden" }, { status: 403 });
  try {
    return Response.json(await runOfficialIngestionBatch(5));
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Sync failed" },
      { status: 502 },
    );
  }
}


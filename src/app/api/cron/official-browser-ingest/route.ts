import { z } from "zod";
import { isCronAuthorized } from "@/lib/cron-auth";
import {
  ingestOfficialBrowserPages,
  recordOfficialBrowserFailure,
} from "@/lib/ingestion/browser-ingestion";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_PAGE_CHARS = 400_000;

const pagesPayloadSchema = z.object({
  sourceId: z.uuid(),
  complete: z.boolean().default(false),
  pages: z.array(z.object({
    url: z.url().refine((url) => url.startsWith("https://"), "HTTPS is required"),
    html: z.string().min(1).max(MAX_PAGE_CHARS),
  })).min(1).max(5),
});
const failurePayloadSchema = z.object({
  sourceId: z.uuid(),
  error: z.string().min(1).max(1000),
});
const payloadSchema = z.union([pagesPayloadSchema, failurePayloadSchema]);

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return Response.json({ message: "Unauthorized" }, { status: 401 });
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return Response.json({ message: "Payload exceeds 2 MB" }, { status: 413 });
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return Response.json({ message: "Invalid JSON payload" }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(value);
  if (!parsed.success) {
    return Response.json({ message: "Invalid browser payload", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    return Response.json(
      "error" in parsed.data
        ? await recordOfficialBrowserFailure(parsed.data.sourceId, parsed.data.error)
        : await ingestOfficialBrowserPages(parsed.data),
    );
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Browser ingestion failed" },
      { status: 502 },
    );
  }
}

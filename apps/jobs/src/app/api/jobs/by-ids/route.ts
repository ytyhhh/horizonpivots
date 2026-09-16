import { z } from "zod";
import { getJobsByIds } from "@/lib/jobs";

const payloadSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(240)).max(100),
}).strict();

export async function POST(request: Request) {
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "岗位编号无效" }, { status: 400 });
  return Response.json({ data: await getJobsByIds(parsed.data.ids) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

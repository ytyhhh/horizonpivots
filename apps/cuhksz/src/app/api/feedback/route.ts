import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const categories = new Set(["bug", "suggestion", "data", "other"]);

function errorResponse(error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" } },
  );
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("请先登录后再提交反馈", 401);

  let body: { category?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }
  const category = typeof body.category === "string" ? body.category : "";
  const content = typeof body.content === "string" ? body.content.trim().slice(0, 1200) : "";
  if (!categories.has(category) || content.length < 10) {
    return errorResponse("请填写 10 至 1200 字的有效反馈", 400);
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceRoleKey) return errorResponse("Feedback service is unavailable", 503);

  try {
    const response = await fetch(`${url}/rest/v1/cuhksz_feedback`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ author_id: userId, category, content, status: "new" }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return errorResponse("反馈暂时无法保存，请稍后再试", 502);
    const [feedback] = (await response.json()) as Array<{ id: string; status: string }>;
    return NextResponse.json({ feedback }, { status: 201, headers: { "Cache-Control": "no-store, private" } });
  } catch {
    return errorResponse("反馈服务暂时不可用，请稍后再试", 502);
  }
}

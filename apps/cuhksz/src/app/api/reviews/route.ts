import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_DETAIL_REVIEWS = 1_000;
const REQUEST_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 40;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const automatedClientPattern = /(?:curl|wget|python|scrapy|httpclient|playwright|puppeteer|selenium|headless)/i;
const targetTypes = new Set(["course", "dish", "hall"]);

type ReviewRow = {
  id: string;
  target_type: "course" | "dish" | "hall";
  target_id: string;
  target: string;
  context: string;
  rating: number | null;
  content: string;
  instructor: string;
  term: string;
  is_historical: boolean;
  created_at: string;
};

type ReviewTarget = {
  target: string;
  context: string;
};

function requestIdentity(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `${ip}:${userAgent.slice(0, 120)}`;
}

function isRateLimited(request: NextRequest) {
  const now = Date.now();
  const key = requestIdentity(request);
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + REQUEST_WINDOW_MS });
    if (requestBuckets.size > 5_000) {
      for (const [bucketKey, bucket] of requestBuckets) {
        if (bucket.resetAt <= now) requestBuckets.delete(bucketKey);
      }
    }
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

function blockedRequest(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") return true;
  return automatedClientPattern.test(request.headers.get("user-agent") || "");
}

function errorResponse(message: string, status: number, headers: HeadersInit = {}) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store, private",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        ...headers,
      },
    },
  );
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function rating(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

async function lookupTarget(url: string, serviceRoleKey: string, type: string, id: string, instructor: string, term: string) {
  const source = type === "course"
    ? { table: "cuhksz_courses", select: "code,name" }
    : type === "dish"
      ? { table: "cuhksz_dishes", select: "name,hall,stall" }
      : { table: "cuhksz_dining_halls", select: "name,location" };
  const params = new URLSearchParams({ select: source.select, id: `eq.${id}`, active: "eq.true", limit: "1" });
  const response = await fetch(`${url}/rest/v1/${source.table}?${params}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("target lookup failed");
  const [row] = (await response.json()) as Array<Record<string, string>>;
  if (!row) return null;
  if (type === "course") {
    return { target: `${row.code} · ${row.name}`, context: `${instructor} · ${term}` } satisfies ReviewTarget;
  }
  if (type === "dish") {
    return { target: row.name, context: [row.hall, row.stall].filter(Boolean).join(" · ") } satisfies ReviewTarget;
  }
  return { target: row.name, context: row.location || "" } satisfies ReviewTarget;
}

export async function GET(request: NextRequest) {
  if (blockedRequest(request)) return errorResponse("Request denied", 403);
  if (isRateLimited(request)) return errorResponse("Too many requests", 429, { "Retry-After": "60" });

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceRoleKey) return errorResponse("Review service is unavailable", 503);

  const targetType = request.nextUrl.searchParams.get("targetType") ?? "";
  const targetId = request.nextUrl.searchParams.get("targetId") ?? "";
  const hasTarget = Boolean(targetType || targetId);
  if (hasTarget && (!targetTypes.has(targetType) || !/^[a-z0-9_-]{1,160}$/i.test(targetId))) {
    return errorResponse("Invalid review target", 400);
  }

  // A detail view receives all reviews for its one selected item. The cap is
  // deliberately high enough for the product data while keeping a malformed
  // request from turning into an unbounded database response.
  const limit = hasTarget ? MAX_DETAIL_REVIEWS : 2;
  const params = new URLSearchParams({
    select: "id,target_type,target_id,target,context,rating,grading_rating,difficulty_rating,content,instructor,term,is_historical,created_at",
    status: "eq.published",
    order: "created_at.desc,id.desc",
    limit: String(limit),
  });
  if (hasTarget) {
    params.set("target_type", `eq.${targetType}`);
    params.set("target_id", `eq.${targetId}`);
  }

  try {
    const response = await fetch(`${url}/rest/v1/cuhksz_reviews?${params}`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return errorResponse("Review service is unavailable", 502);

    const rows = (await response.json()) as ReviewRow[];
    return NextResponse.json(
      { reviews: rows },
      {
        headers: {
          "Cache-Control": "no-store, private",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
          Vary: "Sec-Fetch-Site, User-Agent",
        },
      },
    );
  } catch {
    return errorResponse("Review service is unavailable", 502);
  }
}

export async function POST(request: NextRequest) {
  if (blockedRequest(request)) return errorResponse("Request denied", 403);
  if (isRateLimited(request)) return errorResponse("Too many requests", 429, { "Retry-After": "60" });

  const { userId } = await auth();
  if (!userId) return errorResponse("请先登录后再提交评价", 401);

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceRoleKey) return errorResponse("Review service is unavailable", 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }
  const targetType = text(body.type, 16);
  const targetId = text(body.id, 160);
  const content = text(body.content, 800);
  const instructor = targetType === "course" ? text(body.instructor, 120) : "";
  const term = targetType === "course" ? text(body.term, 80) : "";
  const overall = rating(body.rating);
  const grading = targetType === "course" ? rating(body.gradingRating) : null;
  const difficulty = targetType === "course" ? rating(body.difficultyRating) : null;

  if (!targetTypes.has(targetType) || !/^[a-z0-9_-]{1,160}$/i.test(targetId)) {
    return errorResponse("Invalid review target", 400);
  }
  if (!overall || content.length < 10) return errorResponse("请填写 10 至 800 字的评价及总体评分", 400);
  if (targetType === "course" && (!instructor || !term || !grading || !difficulty)) {
    return errorResponse("课程评价需要授课老师、学期、给分和难度评分", 400);
  }

  try {
    const target = await lookupTarget(url, serviceRoleKey, targetType, targetId, instructor, term);
    if (!target) return errorResponse("该评价对象不存在或已下架", 404);

    const response = await fetch(`${url}/rest/v1/cuhksz_reviews?on_conflict=author_id,target_type,target_id,instructor,term`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        author_id: userId,
        target_type: targetType,
        target_id: targetId,
        target: target.target,
        context: target.context,
        instructor,
        term,
        rating: overall,
        grading_rating: grading,
        difficulty_rating: difficulty,
        content,
        status: "pending",
        is_historical: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return errorResponse("评价暂时无法保存，请稍后再试", 502);
    const [review] = (await response.json()) as ReviewRow[];
    return NextResponse.json({ review }, { status: 201, headers: { "Cache-Control": "no-store, private" } });
  } catch {
    return errorResponse("评价服务暂时不可用，请稍后再试", 502);
  }
}

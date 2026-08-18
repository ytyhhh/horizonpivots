import { NextRequest, NextResponse } from "next/server";

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

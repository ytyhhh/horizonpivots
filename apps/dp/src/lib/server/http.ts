import { NextResponse } from "next/server";
import { serverEnv } from "./env";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export function json<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
}

export function apiError(status: number, code: string, message: string) {
  return json({ error: code, code, message }, { status });
}

export async function readJson(request: Request) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function assertMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin && process.env.NODE_ENV !== "production") return true;
  if (!origin) return false;
  try {
    const allowed = new URL(serverEnv().dpUrl).origin;
    const actual = new URL(origin).origin;
    return actual === allowed || /^http:\/\/localhost:3004$/.test(actual);
  } catch {
    return false;
  }
}

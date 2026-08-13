import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!url || !key || !clerkKey) {
    return NextResponse.json(
      { ok: false, configured: false, message: "Clerk or Supabase environment variables are missing" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await fetch(`${url.replace(/\/$/, "")}/rest/v1/cuhksz_courses?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    return NextResponse.json(
      { ok: result.ok, configured: true, supabaseStatus: result.status },
      { status: result.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, configured: true, message: error instanceof Error ? error.message : "Supabase request failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

  return NextResponse.json(
    {
      mode: supabaseUrl && supabasePublishableKey && clerkPublishableKey ? "live" : "setup-required",
      supabaseUrl,
      supabasePublishableKey,
      clerkPublishableKey,
      platformUrl: process.env.NEXT_PUBLIC_PLATFORM_URL ?? "https://horizonpivots.com",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

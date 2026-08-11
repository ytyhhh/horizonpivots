import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getPersistentSearchJob } from "@/lib/persistent-search";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getCurrentUserId())) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Search storage is not configured" }, { status: 503 });
  const job = await getPersistentSearchJob(id, supabase);
  if (!job) return NextResponse.json({ error: "Search job not found" }, { status: 404 });
  const institutionId = request.nextUrl.searchParams.get("institutionId");
  const cursor = Number(request.nextUrl.searchParams.get("cursor") ?? 0);
  const filtered = institutionId
    ? job.results.filter((item) => item.institutionId === institutionId)
    : job.results;
  return NextResponse.json({
    data: filtered.slice(cursor, cursor + 20),
    nextCursor: cursor + 20 < filtered.length ? cursor + 20 : null,
    total: filtered.length,
  });
}

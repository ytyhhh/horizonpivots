import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getPersistentSearchJob } from "@/lib/persistent-search";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getCurrentUserId())) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Search storage is not configured" }, { status: 503 });
  const job = await getPersistentSearchJob(id, supabase);
  if (!job) return NextResponse.json({ error: "Search job not found" }, { status: 404 });
  return NextResponse.json({ data: job });
}

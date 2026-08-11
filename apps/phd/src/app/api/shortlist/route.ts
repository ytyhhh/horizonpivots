import { NextResponse } from "next/server";
import { shortlistSchema } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const entry = shortlistSchema.parse(await request.json());
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
    {
        const { error } = await supabase.from("phd_shortlist_entries").upsert({
          user_id: userId,
          faculty_id: entry.facultyId,
          faculty_snapshot: entry.facultySnapshot ?? {},
          status: entry.status,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,faculty_id" });
        if (error) throw error;
    }
    return NextResponse.json({ data: { ...entry, updatedAt: new Date().toISOString() } });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid shortlist entry", details: error instanceof Error ? error.message : undefined },
      { status: 400 },
    );
  }
}

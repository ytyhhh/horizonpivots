import { NextResponse } from "next/server";
import { draftRequestSchema } from "@/lib/schema";
import { generateDraft } from "@/lib/siliconflow";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const input = draftRequestSchema.parse(await request.json());
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const draft = await generateDraft(input);
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
    if (input.facultyId) {
        const { error } = await supabase.from("phd_email_drafts").insert({
          user_id: userId,
          faculty_id: input.facultyId,
          subject: draft.subject,
          body: draft.body,
          provider: draft.provider,
        });
        if (error) throw error;
    }
    return NextResponse.json({ data: draft });
  } catch (error) {
    return NextResponse.json(
      { error: "Could not generate draft", details: error instanceof Error ? error.message : undefined },
      { status: 400 },
    );
  }
}

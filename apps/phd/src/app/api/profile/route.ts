import { NextResponse } from "next/server";
import { applicantProfileSchema } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const profile = applicantProfileSchema.parse(await request.json());
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
    {
        const { error } = await supabase.from("phd_profiles").upsert({
          user_id: userId,
          education: profile.education,
          major: profile.major,
          research_experience: profile.researchExperience,
          skills: profile.skills,
          publications: profile.publications,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (error) throw error;
    }
    return NextResponse.json({ data: { ...profile, updatedAt: new Date().toISOString() } });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid profile", details: error instanceof Error ? error.message : undefined },
      { status: 400 },
    );
  }
}

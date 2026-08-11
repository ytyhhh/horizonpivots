import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "A PDF up to 10 MB is required" }, { status: 400 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
  const path = `${userId}/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from("phd-resumes").upload(path, file, { contentType: "application/pdf", upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: { path, name: file.name } }, { status: 201 });
}

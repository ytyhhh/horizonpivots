import { getCurrentUserId } from "@/lib/auth";
import { mapCandidateProfileRow } from "@/lib/profile-data";
import { candidateProfileUpdateSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProfileEmbedding } from "@/lib/vector-sync";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ message: "请先登录" }, { status: 401 });
  const { data, error } = await createAdminClient()
    .from("candidate_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ data: data ? mapCandidateProfileRow(data, userId) : null });
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ message: "请先登录" }, { status: 401 });
  const parsed = candidateProfileUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: "画像字段无效", detail: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { profile, expectedVersion } = parsed.data;
  const admin = createAdminClient();
  const values = {
    graduation_year: profile.graduationYear ?? null,
    education: profile.education,
    major: profile.major,
    skills: profile.skills,
    experiences: profile.experiences,
    project_domains: profile.projectDomains,
    educations: profile.educations,
    work_experiences: profile.workExperiences,
    projects: profile.projects,
    languages: profile.languages,
    certifications: profile.certifications,
    preferred_locations: profile.preferredLocations,
    preferred_industries: profile.preferredIndustries,
    preferred_roles: profile.preferredRoles,
    excluded_companies: profile.excludedCompanies,
    confirmed: profile.confirmed,
    updated_at: new Date().toISOString(),
    embedding: null,
    embedding_content_hash: null,
    embedding_source_hash: null,
    embedding_model: null,
    embedded_at: null,
  };
  const { data: updated, error: updateError } = await admin
    .from("candidate_profiles")
    .update({ ...values, version: expectedVersion + 1 })
    .eq("user_id", userId).eq("version", expectedVersion).select("*").maybeSingle();
  if (updateError) return Response.json({ message: updateError.message }, { status: 500 });
  let saved = updated;
  if (!saved) {
    const { data: existing, error: readError } = await admin
      .from("candidate_profiles").select("version").eq("user_id", userId).maybeSingle();
    if (readError) return Response.json({ message: readError.message }, { status: 500 });
    if (existing || expectedVersion !== 0) {
      return Response.json({ message: "画像已在其他页面更新，请刷新后再保存。", currentVersion: existing?.version ?? 0 }, { status: 409 });
    }
    const { data: inserted, error: insertError } = await admin
      .from("candidate_profiles").insert({ user_id: userId, ...values, version: 1 }).select("*").single();
    if (insertError) {
      if (insertError.code === "23505") return Response.json({ message: "画像已在其他页面创建，请刷新后再保存。" }, { status: 409 });
      return Response.json({ message: insertError.message }, { status: 500 });
    }
    saved = inserted;
  }
  await admin.from("recommendation_cache").delete().eq("user_id", userId);
  if (profile.confirmed) {
    try {
      await syncProfileEmbedding(admin, userId, { ...profile, userId, version: Number(saved.version) });
    } catch (error) {
      console.error("Profile embedding sync failed; profile remains saved:", error);
    }
  }
  return Response.json({ data: mapCandidateProfileRow(saved, userId) });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ message: "请先登录" }, { status: 401 });
  const admin = createAdminClient();
  const { error } = await admin.from("candidate_profiles").delete().eq("user_id", userId);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  await admin.from("recommendation_cache").delete().eq("user_id", userId);
  return Response.json({ message: "画像已清除" });
}

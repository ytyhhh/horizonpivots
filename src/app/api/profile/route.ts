import { getCurrentUserId } from "@/lib/auth";
import { candidateProfileSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProfileEmbedding } from "@/lib/vector-sync";

function mapProfile(data: Record<string, unknown>) {
  return {
    userId: data.user_id,
    graduationYear: data.graduation_year,
    education: data.education,
    major: data.major,
    skills: data.skills ?? [],
    experiences: data.experiences ?? [],
    projectDomains: data.project_domains ?? [],
    preferredLocations: data.preferred_locations ?? [],
    preferredIndustries: data.preferred_industries ?? [],
    preferredRoles: data.preferred_roles ?? [],
    excludedCompanies: data.excluded_companies ?? [],
    confirmed: data.confirmed,
    version: data.version,
  };
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ message: "请先登录" }, { status: 401 });
  const { data, error } = await createAdminClient()
    .from("candidate_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ data: data ? mapProfile(data) : null });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = candidateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { message: "画像字段无效", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ message: "请先登录" }, { status: 401 });
  const profile = parsed.data;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("candidate_profiles")
    .upsert(
      {
        user_id: userId,
        graduation_year: profile.graduationYear,
        education: profile.education,
        major: profile.major,
        skills: profile.skills,
        experiences: profile.experiences,
        project_domains: profile.projectDomains,
        preferred_locations: profile.preferredLocations,
        preferred_industries: profile.preferredIndustries,
        preferred_roles: profile.preferredRoles,
        excluded_companies: profile.excludedCompanies,
        confirmed: profile.confirmed,
        version: profile.version + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
  )
    .select()
    .single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  await admin.from("recommendation_cache").delete().eq("user_id", userId);
  try {
    await syncProfileEmbedding(admin, userId, {
      ...profile,
      userId,
      version: profile.version + 1,
    });
  } catch (embeddingError) {
    console.error("Profile embedding sync failed; profile remains saved:", embeddingError);
  }
  return Response.json({ data: mapProfile(data) });
}

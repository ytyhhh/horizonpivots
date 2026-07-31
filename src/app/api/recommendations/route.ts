import { demoProfile } from "@/data/demo-jobs";
import { getCurrentUserId } from "@/lib/auth";
import { getJobs } from "@/lib/jobs";
import { recommendJobs } from "@/lib/recommendation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CandidateProfile } from "@/types";

export async function GET() {
  let profile = demoProfile;
  let demo = true;

  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ message: "请先登录" }, { status: 401 });
  const { data } = await createAdminClient()
    .from("candidate_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) {
    profile = {
      userId,
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
    } satisfies CandidateProfile;
    demo = false;
  }

  const jobs = await getJobs({});
  return Response.json({
    data: recommendJobs(profile, jobs),
    profileVersion: profile.version,
    demo,
  });
}

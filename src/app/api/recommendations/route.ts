import { demoProfile } from "@/data/demo-jobs";
import { getJobs } from "@/lib/jobs";
import { recommendJobs } from "@/lib/recommendation";
import { createClient } from "@/lib/supabase/server";
import type { CandidateProfile } from "@/types";

export async function GET() {
  const supabase = await createClient();
  let profile = demoProfile;
  let demo = true;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ message: "请先登录" }, { status: 401 });
    const { data } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      profile = {
        userId: user.id,
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
  }

  const jobs = await getJobs({});
  return Response.json({
    data: recommendJobs(profile, jobs),
    profileVersion: profile.version,
    demo,
  });
}

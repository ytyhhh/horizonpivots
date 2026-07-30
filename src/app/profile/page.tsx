import type { Metadata } from "next";
import { ProfileClient } from "@/components/profile-client";
import { demoProfile } from "@/data/demo-jobs";
import { createClient } from "@/lib/supabase/server";
import type { CandidateProfile } from "@/types";

export const metadata: Metadata = {
  title: "简历画像",
  description: "安全解析简历并确认用于岗位推荐的结构化画像。",
};

async function loadProfile() {
  const supabase = await createClient();
  if (!supabase) return { profile: demoProfile, demoMode: true };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { profile: demoProfile, demoMode: true };
  const { data } = await supabase
    .from("candidate_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) {
    return {
      profile: {
        ...demoProfile,
        userId: user.id,
        confirmed: false,
      } satisfies CandidateProfile,
      demoMode: false,
    };
  }
  return {
    demoMode: false,
    profile: {
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
    } satisfies CandidateProfile,
  };
}

export default async function ProfilePage() {
  const { profile, demoMode } = await loadProfile();
  return (
    <div className="page-shell py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
          让岗位先理解你的经历
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
          上传简历后只保留结构化求职画像。原文件会在解析完成或失败后立即删除。
        </p>
      </div>
      <div className="mt-8">
        <ProfileClient initialProfile={profile} demoMode={demoMode} />
      </div>
    </div>
  );
}

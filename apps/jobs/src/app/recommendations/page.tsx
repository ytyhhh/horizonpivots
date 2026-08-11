import type { Metadata } from "next";
import Link from "next/link";
import { Info, SlidersHorizontal } from "@phosphor-icons/react/dist/ssr";
import { RecommendationCard } from "@/components/recommendation-card";
import { demoProfile } from "@/data/demo-jobs";
import { getJobs } from "@/lib/jobs";
import { recommendJobs } from "@/lib/recommendation";
import { getCurrentUserId } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CandidateProfile, RecommendationTier } from "@/types";

export const metadata: Metadata = {
  title: "为你推荐",
  description: "根据技能、经历和求职偏好生成可解释的岗位推荐。",
};

const tiers: RecommendationTier[] = ["高匹配", "值得尝试", "拓展机会"];

async function getProfile(): Promise<{
  profile: CandidateProfile;
  demoMode: boolean;
}> {
  const userId = await getCurrentUserId();
  if (!userId) return { profile: demoProfile, demoMode: true };
  const { data } = await createAdminClient()
    .from("candidate_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { profile: demoProfile, demoMode: true };

  return {
    demoMode: false,
    profile: {
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
    },
  };
}

export default async function RecommendationsPage() {
  const [jobs, profileResult] = await Promise.all([getJobs({}), getProfile()]);
  const recommendations = recommendJobs(profileResult.profile, jobs);

  return (
    <div className="page-shell pb-12 pt-7 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <p className="eyebrow">Personal signal</p>
          <h1 className="utility-title mt-5">
            更适合你的机会
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            综合技能、经历、地点偏好、信息新鲜度与来源可信度排序。
          </p>
        </div>
        <Link
          href="/profile"
          className="button-secondary !min-h-11 !px-4"
        >
          <SlidersHorizontal size={18} weight="bold" aria-hidden="true" />
          调整画像
        </Link>
      </div>

      {profileResult.demoMode ? (
        <div className="mt-7 flex gap-3 rounded-[1rem] bg-accent-soft p-4 text-sm text-accent">
          <Info size={20} weight="fill" className="shrink-0" aria-hidden="true" />
          <p className="leading-6">
            当前展示计算机专业学生的示例推荐。登录并确认简历画像后会替换为你的结果。
          </p>
        </div>
      ) : null}

      <div className="mt-12 grid gap-14">
        {tiers.map((tier) => {
          const items = recommendations.filter((item) => item.tier === tier).slice(0, 4);
          if (!items.length) return null;
          return (
            <section key={tier} data-reveal>
              <div className="mb-5 flex items-center gap-4 border-b border-border/70 pb-4">
                <span className="size-2 rounded-full bg-accent" />
                <h2 className="text-xl font-semibold tracking-[-0.03em]">{tier}</h2>
                <span className="font-mono text-[10px] text-subtle">0{items.length}</span>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {items.map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.job.id}
                    recommendation={recommendation}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-10 border-t pt-5 text-xs leading-5 text-subtle">
        推荐用于帮助你发现机会，不代表招聘资格或录用结果。缺失字段不会被视为不符合条件。
      </p>
    </div>
  );
}

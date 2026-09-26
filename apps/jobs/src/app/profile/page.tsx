import type { Metadata } from "next";
import { ProfileClient } from "@/components/profile-client";
import { emptyCandidateProfile, mapCandidateProfileRow } from "@/lib/profile-data";
import { loginUrl, platformOrigins } from "@horizon/platform";
import { getCurrentUserId } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";


export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "简历画像",
  description: "手动填写或安全解析简历，确认后用于岗位推荐。",
  robots: { index: false, follow: false },
};

async function loadProfile() {
  const userId = await getCurrentUserId();
  if (!userId) return { profile: null, demoMode: false };
  const { data } = await createAdminClient()
    .from("candidate_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    demoMode: false,
    profile: data ? mapCandidateProfileRow(data, userId) : emptyCandidateProfile(userId),
  };
}

export default async function ProfilePage() {
  const { profile, demoMode } = await loadProfile();
  if (!profile) {
    return <div className="page-shell pb-12 pt-10"><h1 className="utility-title">建立求职画像</h1><p className="mt-4 text-muted">登录后可手动填写、保存草稿，并确认用于岗位推荐。</p><a className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-white" href={loginUrl(new URL("/profile", platformOrigins.jobs).toString())}>登录后填写</a></div>;
  }
  return (
    <div className="page-shell pb-12 pt-7 sm:pt-10">
      <div className="max-w-2xl">
        <p className="eyebrow">Private profile</p>
        <h1 className="utility-title mt-5">
          让岗位先理解你的经历
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
          可直接手动填写并保存草稿，也可上传简历辅助填写。上传的原文件在解析后删除。
        </p>
      </div>
      <div className="mt-8">
        <ProfileClient initialProfile={profile} demoMode={demoMode} />
      </div>
    </div>
  );
}

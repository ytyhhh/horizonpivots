import { randomUUID } from "node:crypto";
import { demoProfile } from "@/data/demo-jobs";
import { getCurrentUserId } from "@/lib/auth";
import { extractResumeProfile } from "@/lib/openai";
import { emptyCandidateProfile, mapCandidateProfileRow, mergeExtractedProfile } from "@/lib/profile-data";
import { resumeFileSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/utils";

class ProfileVersionConflict extends Error {}

export const runtime = "nodejs";

function safeStorageName(name: string) {
  return name.toLowerCase().endsWith(".docx") ? "resume.docx" : "resume.pdf";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const result = resumeFileSchema.safeParse(form.get("resume"));
  if (!result.success) {
    return Response.json(
      { message: result.error.issues[0]?.message ?? "文件无效" },
      { status: 400 },
    );
  }

  if (!isConfigured()) {
    return Response.json({
      parseJobId: `demo_${randomUUID()}`,
      profile: { ...demoProfile, confirmed: false, version: demoProfile.version + 1 },
      demo: true,
    });
  }

  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ message: "请先登录" }, { status: 401 });
  if (!process.env.SILICONFLOW_API_KEY) {
    return Response.json({ message: "简历解析服务尚未配置" }, { status: 503 });
  }

  const admin = createAdminClient();
  const parseJobId = randomUUID();
  const storagePath = `${userId}/${parseJobId}/${safeStorageName(result.data.name)}`;
  const bytes = Buffer.from(await result.data.arrayBuffer());

  const { error: parseJobError } = await admin.from("resume_parse_jobs").insert({
    id: parseJobId,
    user_id: userId,
    status: "processing",
    storage_path: storagePath,
  });
  if (parseJobError) {
    return Response.json({ message: "暂时无法创建简历解析任务" }, { status: 500 });
  }

  try {
    const { error: uploadError } = await admin.storage
      .from("resume-temp")
      .upload(storagePath, bytes, {
        contentType: result.data.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const extracted = await extractResumeProfile(result.data);
    const { data: current, error: currentError } = await admin
      .from("candidate_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (currentError) throw currentError;

    const existingProfile = current
      ? mapCandidateProfileRow(current, userId)
      : emptyCandidateProfile(userId);
    const profile = mergeExtractedProfile(existingProfile, extracted);
    const profileValues = {
      graduation_year: profile.graduationYear,
      education: profile.education,
      major: profile.major,
      skills: profile.skills,
      experiences: profile.experiences,
      project_domains: profile.projectDomains,
      confirmed: false,
      version: existingProfile.version + 1,
      embedding: null,
      embedding_content_hash: null,
      embedding_source_hash: null,
      embedding_model: null,
      embedded_at: null,
    };
    if (current) {
      const { data: updated, error: profileError } = await admin
        .from("candidate_profiles")
        .update(profileValues)
        .eq("user_id", userId)
        .eq("version", existingProfile.version)
        .select("version")
        .maybeSingle();
      if (profileError) throw profileError;
      if (!updated) throw new ProfileVersionConflict("画像已在其他页面更新，请刷新后重试");
    } else {
      const { error: profileError } = await admin.from("candidate_profiles").insert({
        user_id: userId,
        ...profileValues,
      });
      if (profileError?.code === "23505") {
        throw new ProfileVersionConflict("画像已在其他页面创建，请刷新后重试");
      }
      if (profileError) throw profileError;
    }

    const { error: cacheError } = await admin
      .from("recommendation_cache")
      .delete()
      .eq("user_id", userId);
    if (cacheError) {
      console.error("Recommendation cache cleanup failed after resume upload:", cacheError);
    }
    await admin
      .from("resume_parse_jobs")
      .update({ status: "succeeded", finished_at: new Date().toISOString() })
      .eq("id", parseJobId);
    return Response.json({ parseJobId, profile: { ...profile, version: profileValues.version } });
  } catch (error) {
    console.error("Resume parsing failed:", error);
    await admin
      .from("resume_parse_jobs")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
        finished_at: new Date().toISOString(),
      })
      .eq("id", parseJobId);
    return Response.json({
      parseJobId,
      message: error instanceof ProfileVersionConflict
        ? error.message
        : "解析失败，请检查硅基流动密钥、模型权限与账户余额后重试",
    }, { status: error instanceof ProfileVersionConflict ? 409 : 502 });
  } finally {
    await admin.storage.from("resume-temp").remove([storagePath]);
    await admin
      .from("resume_parse_jobs")
      .update({ storage_path: null })
      .eq("id", parseJobId);
  }
}

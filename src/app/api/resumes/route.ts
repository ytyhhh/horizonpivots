import { randomUUID } from "node:crypto";
import { demoProfile } from "@/data/demo-jobs";
import { getCurrentUserId } from "@/lib/auth";
import { extractResumeProfile } from "@/lib/openai";
import { resumeFileSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProfileEmbedding } from "@/lib/vector-sync";
import { isConfigured } from "@/lib/utils";
import type { CandidateProfile } from "@/types";

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

  await admin.from("resume_parse_jobs").insert({
    id: parseJobId,
    user_id: userId,
    status: "processing",
    storage_path: storagePath,
  });

  try {
    const { error: uploadError } = await admin.storage
      .from("resume-temp")
      .upload(storagePath, bytes, {
        contentType: result.data.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const extracted = await extractResumeProfile(result.data);
    const profile: CandidateProfile = {
      userId,
      ...extracted,
      preferredLocations: [],
      preferredIndustries: [],
      preferredRoles: [],
      excludedCompanies: [],
      confirmed: false,
      version: 1,
    };
    const { data: current } = await admin
      .from("candidate_profiles")
      .select("version")
      .eq("user_id", userId)
      .maybeSingle();
    profile.version = (current?.version ?? 0) + 1;

    const { error: profileError } = await admin.from("candidate_profiles").upsert(
      {
        user_id: userId,
        graduation_year: profile.graduationYear,
        education: profile.education,
        major: profile.major,
        skills: profile.skills,
        experiences: profile.experiences,
        project_domains: profile.projectDomains,
        confirmed: false,
        version: profile.version,
      },
      { onConflict: "user_id" },
    );
    if (profileError) throw profileError;
    try {
      await syncProfileEmbedding(admin, userId, profile);
    } catch (embeddingError) {
      console.error("Profile embedding sync failed; profile remains saved:", embeddingError);
    }
    await admin
      .from("resume_parse_jobs")
      .update({ status: "succeeded", finished_at: new Date().toISOString() })
      .eq("id", parseJobId);
    return Response.json({ parseJobId, profile });
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
      message: "解析失败，请检查硅基流动密钥、模型权限与账户余额后重试",
    }, { status: 502 });
  } finally {
    await admin.storage.from("resume-temp").remove([storagePath]);
    await admin
      .from("resume_parse_jobs")
      .update({ storage_path: null })
      .eq("id", parseJobId);
  }
}

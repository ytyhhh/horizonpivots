import { createHash } from "node:crypto";
import type { CandidateProfile, Job } from "@/types";

export const SILICONFLOW_EMBEDDING_MODEL = "BAAI/bge-m3";
export const SILICONFLOW_EMBEDDING_DIMENSIONS = 1024;

const MAX_EMBEDDING_CHARS = 24_000;

type SiliconFlowEmbeddingResponse = {
  data?: Array<{ embedding?: unknown }>;
  message?: string;
};

function embeddingApiUrl() {
  return process.env.SILICONFLOW_EMBEDDING_API_URL ?? "https://api.siliconflow.cn/v1/embeddings";
}

export function isEmbeddingConfigured() {
  return Boolean(process.env.SILICONFLOW_API_KEY);
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_EMBEDDING_CHARS);
}

export function jobEmbeddingText(job: Job) {
  return compactText(
    [
      `公司：${job.company}`,
      `岗位：${job.title}`,
      `类型：${job.type}`,
      `行业：${job.industry}`,
      `地点：${job.locations.join("、")}`,
      `届别：${job.cohort}`,
      `技能：${job.skills.join("、")}`,
      `摘要：${job.summary}`,
      `岗位描述：${job.description ?? ""}`,
    ].join("\n"),
  );
}

export function profileEmbeddingText(profile: CandidateProfile) {
  return compactText(
    [
      `毕业年份：${profile.graduationYear ?? "未提供"}`,
      `学历：${profile.education ?? ""}`,
      `专业：${profile.major ?? ""}`,
      `技能：${profile.skills.join("、")}`,
      `经历摘要：${profile.experiences.join("；")}`,
      `项目领域：${profile.projectDomains.join("、")}`,
      `期望地点：${profile.preferredLocations.join("、")}`,
      `期望行业：${profile.preferredIndustries.join("、")}`,
      `期望岗位：${profile.preferredRoles.join("、")}`,
    ].join("\n"),
  );
}

export function embeddingContentHash(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Creates vectors through SiliconFlow's OpenAI-compatible Embeddings endpoint.
 * Resume and job text are data only; no prompt or instruction is sent here.
 */
export async function createEmbeddings(inputs: string[]) {
  if (!inputs.length) return [];
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) throw new Error("SILICONFLOW_API_KEY is not configured");

  const response = await fetch(embeddingApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.SILICONFLOW_EMBEDDING_MODEL ?? SILICONFLOW_EMBEDDING_MODEL,
      input: inputs,
      encoding_format: "float",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  const payload = (await response.json().catch(() => null)) as SiliconFlowEmbeddingResponse | null;
  if (!response.ok) {
    throw new Error(
      `SiliconFlow embeddings failed (${response.status}): ${payload?.message ?? "unknown error"}`,
    );
  }

  const vectors = payload?.data?.map((item) => item.embedding);
  if (!vectors || vectors.length !== inputs.length) {
    throw new Error("SiliconFlow embeddings returned an incomplete result");
  }
  return vectors.map((vector) => {
    if (
      !Array.isArray(vector) ||
      vector.length !== SILICONFLOW_EMBEDDING_DIMENSIONS ||
      vector.some((value) => typeof value !== "number" || !Number.isFinite(value))
    ) {
      throw new Error("SiliconFlow embeddings returned an invalid BAAI/bge-m3 vector");
    }
    return vector as number[];
  });
}

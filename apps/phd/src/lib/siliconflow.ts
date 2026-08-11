import OpenAI from "openai";
import { aiDraftSchema, aiRankingSchema, aiSearchQuerySchema } from "@/lib/schema";
import type { ApplicantProfile, EmailDraft, FacultyRecommendation, SearchQuery } from "@/lib/types";

const getClient = () => {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.com/v1",
  });
};

const model = () => process.env.SILICONFLOW_MODEL || "Qwen/Qwen3-32B";

const queryCache = new Map<string, Promise<string>>();

const extractJson = (content: string) => {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse(fenced || content);
};

export async function structureAcademicQuery(query: SearchQuery): Promise<string> {
  const fallback = [query.doctoralField, ...query.researchKeywords, query.researchDescription]
    .join(" ")
    .slice(0, 320);
  const client = getClient();
  if (!client) return fallback;

  const cacheKey = JSON.stringify({
    field: query.doctoralField,
    description: query.researchDescription,
    keywords: query.researchKeywords,
    departments: query.preferredDepartments,
  });
  const existing = queryCache.get(cacheKey);
  if (existing) return existing;

  const task = (async () => {
    try {
      const response = await client.chat.completions.create({
        model: model(),
        messages: [
          {
            role: "system",
            content:
              "Convert a PhD research request into concise English academic search terms for OpenAlex. Preserve technical meaning, translate Chinese when needed, and do not add unrelated topics. Return JSON only.",
          },
          {
            role: "user",
            content: JSON.stringify({
              doctoralField: query.doctoralField,
              researchDescription: query.researchDescription,
              researchKeywords: query.researchKeywords,
              preferredDepartments: query.preferredDepartments,
              outputShape: { searchText: "string under 320 characters", englishKeywords: ["string"] },
            }),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 500,
      });
      const content = response.choices[0]?.message?.content;
      if (!content) return fallback;
      return aiSearchQuerySchema.parse(extractJson(content)).searchText;
    } catch (error) {
      console.warn("SiliconFlow query structuring fallback:", error);
      return fallback;
    }
  })();
  queryCache.set(cacheKey, task);
  return task;
}

export async function enhanceRanking(
  candidates: FacultyRecommendation[],
  query: SearchQuery,
): Promise<FacultyRecommendation[]> {
  const client = getClient();
  if (!client || candidates.length === 0) return candidates;

  try {
    const compactCandidates = candidates.slice(0, 20).map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      school: candidate.institutionName,
      works: candidate.publications.map((work) => `${work.year}: ${work.title}`),
    }));

    const response = await client.chat.completions.create({
      model: model(),
      messages: [
        {
          role: "system",
          content:
            "You evaluate PhD supervisor research fit. Use only the supplied publication titles. Return JSON only. Never infer recruiting status or invent facts.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Score topic and methods fit from 0 to 100 and provide concise Chinese reasons.",
            doctoralField: query.doctoralField,
            researchDescription: query.researchDescription,
            keywords: query.researchKeywords,
            applicantSkills: query.profile?.skills ?? [],
            candidates: compactCandidates,
            outputShape: {
              candidates: [{ id: "string", topicFit: 0, methodsFit: 0, reasons: ["string"], summary: "string" }],
            },
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2400,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return candidates;
    const parsed = aiRankingSchema.parse(extractJson(content));
    const byId = new Map(parsed.candidates.map((candidate) => [candidate.id, candidate]));

    return candidates.map((candidate) => {
      const ai = byId.get(candidate.id);
      if (!ai) return candidate;
      const scoreBreakdown = {
        ...candidate.scoreBreakdown,
        topicFit: Math.round(ai.topicFit),
        methodsFit: Math.round(ai.methodsFit),
      };
      const matchScore = Math.round(
        scoreBreakdown.topicFit * 0.55 +
          scoreBreakdown.researchContinuity * 0.15 +
          scoreBreakdown.methodsFit * 0.15 +
          scoreBreakdown.advisorEligibility * 0.1 +
          scoreBreakdown.recruitingSignal * 0.05,
      );
      return {
        ...candidate,
        scoreBreakdown,
        matchScore,
        matchReasons: ai.reasons,
        researchSummary: ai.summary,
      };
    });
  } catch (error) {
    console.warn("SiliconFlow ranking fallback:", error);
    return candidates;
  }
}

export async function generateDraft({
  faculty,
  profile,
  doctoralField,
  researchDescription,
}: {
  faculty: {
    name: string;
    title: string;
    institutionName: string;
    researchSummary: string;
    publications: Array<{ title: string; year: number }>;
  };
  profile: ApplicantProfile;
  doctoralField: string;
  researchDescription: string;
}): Promise<EmailDraft> {
  const fallback: EmailDraft = {
    subject: `Prospective PhD student interested in ${doctoralField}`,
    body: `Dear Professor ${faculty.name.split(" ").at(-1)},\n\nI am writing to ask whether you are considering new PhD students. My background is in ${profile.major || doctoralField}, and my recent work has focused on ${profile.researchExperience || researchDescription}. I was especially interested in your research on ${faculty.researchSummary.toLowerCase()}.\n\nMy experience with ${(profile.skills.length ? profile.skills : ["research design and analysis"]).join(", ")} could support work in this area. I would be grateful for the opportunity to learn whether my interests might fit your group and any upcoming doctoral projects.\n\nI have attached my CV for context. Thank you for your time and consideration.\n\nBest regards`,
    provider: "template",
  };

  const client = getClient();
  if (!client) return fallback;

  try {
    const response = await client.chat.completions.create({
      model: model(),
      messages: [
        {
          role: "system",
          content:
            "Write a concise, respectful English PhD inquiry email of 120 to 180 words. Use only supplied facts. Do not claim the professor is recruiting. Return JSON with subject and body.",
        },
        {
          role: "user",
          content: JSON.stringify({ faculty, profile, doctoralField, researchDescription }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.35,
      max_tokens: 900,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) return fallback;
    return { ...aiDraftSchema.parse(extractJson(content)), provider: "siliconflow" };
  } catch (error) {
    console.warn("SiliconFlow draft fallback:", error);
    return fallback;
  }
}

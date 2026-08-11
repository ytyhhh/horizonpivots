import { z } from "zod";

export const applicantProfileSchema = z.object({
  id: z.string().min(1),
  education: z.string().max(300),
  major: z.string().max(160),
  researchExperience: z.string().max(3000),
  skills: z.array(z.string().min(1).max(80)).max(30),
  publications: z.string().max(2000).optional(),
});

export const searchQuerySchema = z.object({
  selectedInstitutionIds: z.array(z.string()).min(1).max(10),
  doctoralField: z.string().trim().min(2).max(160),
  researchDescription: z.string().trim().min(12).max(3000),
  researchKeywords: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  preferredDepartments: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
  profileId: z.string().min(1),
  profile: applicantProfileSchema.optional(),
  locale: z.enum(["zh", "en"]).optional(),
});

export const shortlistSchema = z.object({
  facultyId: z.string().min(1),
  status: z.enum(["saved", "preparing", "contacted", "replied", "closed"]),
  facultySnapshot: z.record(z.string(), z.unknown()).optional(),
});

export const draftRequestSchema = z.object({
  facultyId: z.string().optional(),
  faculty: z.object({
    name: z.string(),
    title: z.string(),
    institutionName: z.string(),
    researchSummary: z.string(),
    publications: z.array(z.object({ title: z.string(), year: z.number() })).max(5),
  }),
  profile: applicantProfileSchema,
  doctoralField: z.string(),
  researchDescription: z.string(),
});

export const aiDraftSchema = z.object({
  subject: z.string().min(4).max(140),
  body: z.string().min(200).max(2400),
});

export const aiRankingSchema = z.object({
  candidates: z.array(
    z.object({
      id: z.string(),
      topicFit: z.number().min(0).max(100),
      methodsFit: z.number().min(0).max(100),
      reasons: z.array(z.string()).min(1).max(3),
      summary: z.string().min(12).max(500),
    }),
  ),
});

export const aiSearchQuerySchema = z.object({
  searchText: z.string().trim().min(8).max(320),
  englishKeywords: z.array(z.string().trim().min(2).max(80)).min(2).max(12),
});

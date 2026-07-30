import { z } from "zod";
import { INDUSTRIES } from "@/types";

export const jobQuerySchema = z.object({
  query: z.string().trim().max(100).default(""),
  type: z.enum(["秋招", "实习"]).optional(),
  industry: z.enum(INDUSTRIES).optional(),
  location: z.string().trim().max(30).optional(),
  cohort: z.string().trim().max(20).optional(),
  deadlineWithin: z.coerce.number().int().min(1).max(180).optional(),
  confidence: z.enum(["官方", "已核验", "社区线索"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const candidateProfileSchema = z.object({
  graduationYear: z.number().int().min(2024).max(2035).nullable().optional(),
  education: z.string().trim().max(30).default(""),
  major: z.string().trim().max(80).default(""),
  skills: z.array(z.string().trim().min(1).max(50)).max(40).default([]),
  experiences: z.array(z.string().trim().min(1).max(240)).max(12).default([]),
  projectDomains: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  preferredLocations: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
  preferredIndustries: z.array(z.enum(INDUSTRIES)).max(14).default([]),
  preferredRoles: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  excludedCompanies: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  confirmed: z.boolean().default(false),
  version: z.number().int().min(1).default(1),
});

export const resumeFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "文件不能为空")
  .refine((file) => file.size <= 5 * 1024 * 1024, "文件不能超过 5 MB")
  .refine(
    (file) =>
      [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(file.type),
    "仅支持 PDF 或 DOCX",
  );

export const rawXixiccJobSchema = z.object({
  company: z.string().trim().min(1),
  cohort: z.string().nullable().optional(),
  batch: z.string().nullable().optional(),
  program: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  positions: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  apply_url: z.string().url().nullable().optional(),
  official_wechat: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  campus_only: z.boolean().optional(),
  first_seen: z.string().optional(),
  last_seen: z.string().optional(),
  confirmed_by: z.number().optional(),
});

export const rawXixiccJobsSchema = z.array(rawXixiccJobSchema);

export const resumeExtractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    graduationYear: { type: ["integer", "null"] },
    education: { type: "string" },
    major: { type: "string" },
    skills: { type: "array", items: { type: "string" }, maxItems: 40 },
    experiences: { type: "array", items: { type: "string" }, maxItems: 12 },
    projectDomains: { type: "array", items: { type: "string" }, maxItems: 20 },
  },
  required: [
    "graduationYear",
    "education",
    "major",
    "skills",
    "experiences",
    "projectDomains",
  ],
} as const;

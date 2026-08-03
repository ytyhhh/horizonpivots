export const INDUSTRIES = [
  "互联网",
  "半导体/硬件",
  "新能源车企",
  "传统车企",
  "游戏",
  "外企",
  "银行/金融",
  "制造业",
  "央国企",
  "军工/研究所",
  "高校/事业单位",
  "医药/生物",
  "快消/零售",
  "其他",
] as const;

export type Industry = (typeof INDUSTRIES)[number];
export type JobType = "秋招" | "春招" | "实习";
export type JobStatus = "active" | "stale" | "archived" | "review";
export type SourceConfidence = "官方" | "已核验" | "社区线索";
export type RecommendationTier = "高匹配" | "值得尝试" | "拓展机会";

export interface Job {
  id: string;
  company: string;
  title: string;
  program?: string | null;
  type: JobType;
  batch: string;
  industry: Industry;
  locations: string[];
  cohort: string;
  skills: string[];
  summary: string;
  /** 招聘方公开页面中的纯文本岗位说明；不保存原始 HTML。 */
  description?: string;
  deadline?: string | null;
  applyUrl?: string | null;
  sourceUrl: string;
  sourceName: string;
  sourceConfidence: SourceConfidence;
  firstSeen: string;
  lastSeen: string;
  status: JobStatus;
  fingerprint: string;
  /** 仅面向已验证的港中深学校邮箱账号展示。 */
  cuhkShenzhenOnly?: boolean;
}

export interface CandidateProfile {
  userId?: string;
  graduationYear?: number | null;
  education?: string;
  major?: string;
  skills: string[];
  experiences: string[];
  projectDomains: string[];
  preferredLocations: string[];
  preferredIndustries: Industry[];
  preferredRoles: string[];
  excludedCompanies: string[];
  confirmed: boolean;
  version: number;
}

export interface RecommendationScores {
  semantic: number;
  skills: number;
  preference: number;
  freshness: number;
  source: number;
}

export interface Recommendation {
  job: Job;
  tier: RecommendationTier;
  totalScore: number;
  scores: RecommendationScores;
  matches: string[];
  gaps: string[];
  explanation: string;
  profileVersion: number;
}

export interface Source {
  id: string;
  name: string;
  kind: "json" | "rss" | "html" | "sitemap" | "web-search";
  url: string;
  enabled: boolean;
  confidence: SourceConfidence;
  lastRunAt?: string | null;
  lastSuccessAt?: string | null;
  health: "healthy" | "degraded" | "paused";
}

export interface IngestionRun {
  id: string;
  sourceId: string;
  startedAt: string;
  finishedAt?: string | null;
  status: "running" | "succeeded" | "failed";
  fetched: number;
  created: number;
  updated: number;
  reviewed: number;
  error?: string | null;
}

export type RegionCode = "US" | "GB" | "HK" | "SG";

export type Institution = {
  id: string;
  openAlexId: string;
  rorId: string;
  name: string;
  nameZh: string;
  shortName: string;
  region: RegionCode;
  country: string;
  city: string;
  domain: string;
  homepage: string;
  logoUrl?: string;
};

export type ApplicantProfile = {
  id: string;
  education: string;
  major: string;
  researchExperience: string;
  skills: string[];
  publications?: string;
};

export type SearchQuery = {
  selectedInstitutionIds: string[];
  doctoralField: string;
  researchDescription: string;
  researchKeywords: string[];
  preferredDepartments?: string[];
  profileId: string;
  profile?: ApplicantProfile;
  locale?: "zh" | "en";
};

export type Evidence = {
  label: string;
  url: string;
  source: "official" | "openalex" | "semantic-scholar";
  verifiedAt: string;
  excerpt?: string;
};

export type Publication = {
  id: string;
  title: string;
  year: number;
  url: string;
  topic?: string;
  abstract?: string;
  semanticScholarUrl?: string;
};

export type AdmissionStatus =
  | "accepting"
  | "possibly_accepting"
  | "unknown"
  | "not_accepting";

export type ScoreBreakdown = {
  topicFit: number;
  researchContinuity: number;
  methodsFit: number;
  advisorEligibility: number;
  recruitingSignal: number;
};

export type FacultyRecommendation = {
  id: string;
  authorId: string;
  name: string;
  institutionId: string;
  institutionName: string;
  title: string;
  department?: string;
  officialProfileUrl?: string;
  openAlexUrl: string;
  email?: string;
  matchScore: number;
  scoreBreakdown: ScoreBreakdown;
  matchReasons: string[];
  researchSummary: string;
  publications: Publication[];
  evidence: Evidence[];
  admissionStatus: AdmissionStatus;
  verification: "official" | "academic_graph";
};

export type SchoolProgress = {
  institutionId: string;
  institutionName: string;
  status: "queued" | "discovering" | "verifying" | "complete" | "failed";
  discovered: number;
  verified: number;
  highMatch: number;
  error?: string;
};

export type SearchJob = {
  id: string;
  status: "queued" | "running" | "complete" | "partial" | "failed";
  stage: "queued" | "discovering" | "verifying" | "ranking" | "complete";
  progress: number;
  query: SearchQuery;
  schools: SchoolProgress[];
  results: FacultyRecommendation[];
  createdAt: string;
  completedAt?: string;
  error?: string;
};

export type ShortlistStatus =
  | "saved"
  | "preparing"
  | "contacted"
  | "replied"
  | "closed";

export type EmailDraft = {
  subject: string;
  body: string;
  provider: "siliconflow" | "template";
};

import { candidateProfileSchema } from "@/lib/schemas";
import type { CandidateProfile } from "@/types";

export function emptyCandidateProfile(userId: string): CandidateProfile {
  return {
    userId,
    graduationYear: null,
    education: "",
    major: "",
    skills: [],
    experiences: [],
    projectDomains: [],
    educations: [],
    workExperiences: [],
    projects: [],
    languages: [],
    certifications: [],
    preferredLocations: [],
    preferredIndustries: [],
    preferredRoles: [],
    excludedCompanies: [],
    confirmed: false,
    version: 0,
  };
}

export function mapCandidateProfileRow(row: Record<string, unknown>, userId: string): CandidateProfile {
  const parsed = candidateProfileSchema.parse({
    graduationYear: row.graduation_year ?? null,
    education: row.education ?? "",
    major: row.major ?? "",
    skills: row.skills ?? [],
    experiences: row.experiences ?? [],
    projectDomains: row.project_domains ?? [],
    educations: row.educations ?? [],
    workExperiences: row.work_experiences ?? [],
    projects: row.projects ?? [],
    languages: row.languages ?? [],
    certifications: row.certifications ?? [],
    preferredLocations: row.preferred_locations ?? [],
    preferredIndustries: row.preferred_industries ?? [],
    preferredRoles: row.preferred_roles ?? [],
    excludedCompanies: row.excluded_companies ?? [],
    confirmed: row.confirmed === true,
    version: row.version ?? 1,
  });
  return { ...parsed, userId };
}

export function mergeExtractedProfile(
  current: CandidateProfile,
  extracted: Pick<CandidateProfile, "graduationYear" | "education" | "major" | "skills" | "experiences" | "projectDomains">,
): CandidateProfile {
  return {
    ...current,
    graduationYear: current.graduationYear ?? extracted.graduationYear ?? null,
    education: current.education?.trim() ? current.education : extracted.education ?? "",
    major: current.major?.trim() ? current.major : extracted.major ?? "",
    skills: current.skills.length ? current.skills : extracted.skills,
    experiences: current.experiences.length ? current.experiences : extracted.experiences,
    projectDomains: current.projectDomains.length ? current.projectDomains : extracted.projectDomains,
    confirmed: false,
  };
}

export function profileSkills(profile: CandidateProfile): string[] {
  return Array.from(new Set([
    ...profile.skills,
    ...(profile.projects ?? []).flatMap((project) => project.technologies),
    ...(profile.languages ?? []),
    ...(profile.certifications ?? []),
  ]));
}

export function profileContent(profile: CandidateProfile): string[] {
  return [
    profile.major ?? "",
    ...profile.projectDomains,
    ...profile.experiences,
    ...(profile.educations ?? []).flatMap((entry) => [entry.school, entry.degree, entry.major, entry.coursework]),
    ...(profile.workExperiences ?? []).flatMap((entry) => [entry.organization, entry.role, entry.achievements]),
    ...(profile.projects ?? []).flatMap((entry) => [entry.name, entry.role, entry.outcome]),
    ...(profile.languages ?? []),
    ...(profile.certifications ?? []),
  ].filter(Boolean);
}

import { describe, expect, it } from "vitest";
import { candidateProfileUpdateSchema } from "@/lib/schemas";
import {
  emptyCandidateProfile,
  mapCandidateProfileRow,
  mergeExtractedProfile,
  profileContent,
  profileSkills,
} from "@/lib/profile-data";

describe("manual profile data", () => {
  it("starts as a savable empty draft without an uploaded resume", () => {
    const profile = emptyCandidateProfile("user_test");
    const { userId, version, ...editable } = profile;
    expect(userId).toBe("user_test");
    expect(version).toBe(0);
    expect(candidateProfileUpdateSchema.safeParse({ expectedVersion: 0, profile: editable }).success).toBe(true);
    expect(profile.confirmed).toBe(false);
  });

  it("maps a historical profile without new columns to empty manual entries", () => {
    const profile = mapCandidateProfileRow({
      user_id: "user_test", version: 4, confirmed: true,
      skills: ["Python"], experiences: [], project_domains: [],
      preferred_locations: [], preferred_industries: [], preferred_roles: [],
      excluded_companies: [],
    }, "user_test");
    expect(profile.version).toBe(4);
    expect(profile.educations).toEqual([]);
    expect(profile.workExperiences).toEqual([]);
    expect(profile.projects).toEqual([]);
  });

  it("upload extraction only fills blank basics and preserves manual entries", () => {
    const current = {
      ...emptyCandidateProfile("user_test"),
      version: 3,
      education: "硕士",
      skills: ["TypeScript"],
      projects: [{ name: "校园平台", role: "开发", technologies: ["Next.js"], outcome: "上线" }],
      preferredRoles: ["前端开发"],
      confirmed: true,
    };
    const merged = mergeExtractedProfile(current, {
      graduationYear: 2027,
      education: "本科",
      major: "计算机",
      skills: ["Python"],
      experiences: ["完成实习"],
      projectDomains: ["推荐系统"],
    });
    expect(merged.education).toBe("硕士");
    expect(merged.major).toBe("计算机");
    expect(merged.skills).toEqual(["TypeScript"]);
    expect(merged.projects).toEqual(current.projects);
    expect(merged.preferredRoles).toEqual(["前端开发"]);
    expect(merged.confirmed).toBe(false);
    expect(merged.version).toBe(3);
  });

  it("manual projects, work and credentials become recommendation evidence", () => {
    const profile = {
      ...emptyCandidateProfile("user_test"),
      projects: [{ name: "推荐系统", role: "开发", technologies: ["Python"], outcome: "提高召回" }],
      workExperiences: [{ organization: "示例单位", role: "算法实习生", startMonth: "2025-01", endMonth: "2025-06", achievements: "优化检索" }],
      languages: ["英语 CET-6"],
      certifications: ["AWS 认证"],
    };
    expect(profileSkills(profile)).toEqual(["Python", "英语 CET-6", "AWS 认证"]);
    expect(profileContent(profile)).toContain("优化检索");
    expect(profileContent(profile)).toContain("推荐系统");
  });
});

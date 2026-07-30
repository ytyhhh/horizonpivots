import { differenceInCalendarDays } from "date-fns";
import type {
  CandidateProfile,
  Job,
  Recommendation,
  RecommendationScores,
  RecommendationTier,
} from "@/types";
import { isExpired, toJobSearchText } from "@/lib/utils";

const RELATED_SKILLS: Record<string, string[]> = {
  Python: ["机器学习", "深度学习", "数据分析", "算法"],
  SQL: ["数据分析", "数据建模", "推荐系统"],
  机器学习: ["深度学习", "人工智能", "算法", "推荐系统"],
  产品设计: ["AI 产品", "用户研究", "产品增长"],
  "C++": ["嵌入式", "机器人", "自动驾驶", "系统设计"],
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function scoreSkills(profile: CandidateProfile, job: Job) {
  if (!job.skills.length || !profile.skills.length) return 0.35;
  const owned = new Set(profile.skills.map((skill) => skill.toLocaleLowerCase()));
  let matched = 0;
  for (const required of job.skills) {
    const normalized = required.toLocaleLowerCase();
    if (owned.has(normalized)) {
      matched += 1;
      continue;
    }
    const related = profile.skills.some((skill) =>
      (RELATED_SKILLS[skill] ?? []).some(
        (item) =>
          normalized.includes(item.toLocaleLowerCase()) ||
          item.toLocaleLowerCase().includes(normalized),
      ),
    );
    if (related) matched += 0.4;
  }
  return clamp(matched / job.skills.length);
}

function scoreSemantic(profile: CandidateProfile, job: Job) {
  const terms = [
    ...profile.skills,
    ...profile.preferredRoles,
    ...profile.projectDomains,
    profile.major ?? "",
  ]
    .map((term) => term.toLocaleLowerCase())
    .filter(Boolean);
  if (!terms.length) return 0.4;
  const jobText = toJobSearchText(job);
  const hits = terms.filter((term) => jobText.includes(term)).length;
  return clamp(0.28 + (hits / terms.length) * 0.72);
}

function scorePreference(profile: CandidateProfile, job: Job) {
  const industry =
    !profile.preferredIndustries.length ||
    profile.preferredIndustries.includes(job.industry)
      ? 1
      : 0;
  const location =
    !profile.preferredLocations.length ||
    job.locations.some((place) => profile.preferredLocations.includes(place))
      ? 1
      : 0;
  const role =
    !profile.preferredRoles.length ||
    profile.preferredRoles.some((name) =>
      `${job.title} ${job.summary}`.toLocaleLowerCase().includes(name.toLocaleLowerCase()),
    )
      ? 1
      : 0;
  return industry * 0.4 + location * 0.35 + role * 0.25;
}

function scoreFreshness(job: Job, now: Date) {
  const days = Math.max(
    0,
    differenceInCalendarDays(now, new Date(`${job.firstSeen}T00:00:00+08:00`)),
  );
  return clamp(1 - days / 45);
}

function scoreSource(job: Job) {
  return {
    官方: 1,
    已核验: 0.8,
    社区线索: 0.45,
  }[job.sourceConfidence];
}

function tierFor(score: number): RecommendationTier {
  if (score >= 0.68) return "高匹配";
  if (score >= 0.5) return "值得尝试";
  return "拓展机会";
}

export function isEligible(profile: CandidateProfile, job: Job, now = new Date()) {
  if (job.status === "archived" || isExpired(job.deadline, now)) return false;
  if (profile.excludedCompanies.includes(job.company)) return false;
  if (
    profile.graduationYear &&
    job.cohort !== "不限" &&
    !job.cohort.includes(String(profile.graduationYear))
  ) {
    return false;
  }
  return true;
}

export function recommendJobs(
  profile: CandidateProfile,
  jobs: Job[],
  now = new Date("2026-07-30T12:00:00+08:00"),
): Recommendation[] {
  return jobs
    .filter((job) => isEligible(profile, job, now))
    .map((job) => {
      const scores: RecommendationScores = {
        semantic: scoreSemantic(profile, job),
        skills: scoreSkills(profile, job),
        preference: scorePreference(profile, job),
        freshness: scoreFreshness(job, now),
        source: scoreSource(job),
      };
      const totalScore =
        scores.semantic * 0.5 +
        scores.skills * 0.25 +
        scores.preference * 0.1 +
        scores.freshness * 0.1 +
        scores.source * 0.05;
      const matches = job.skills.filter((skill) =>
        profile.skills.some(
          (owned) => owned.toLocaleLowerCase() === skill.toLocaleLowerCase(),
        ),
      );
      const gaps = job.skills
        .filter((skill) => !matches.includes(skill))
        .slice(0, 2);
      const preferenceMatch = job.locations.find((location) =>
        profile.preferredLocations.includes(location),
      );

      return {
        job,
        tier: tierFor(totalScore),
        totalScore,
        scores,
        matches,
        gaps,
        explanation: [
          matches.length
            ? `你的 ${matches.slice(0, 3).join("、")} 与岗位要求直接相关。`
            : "你的经历方向与岗位存在可迁移能力。",
          preferenceMatch ? `工作地点包含你偏好的${preferenceMatch}。` : "",
          gaps.length ? `投递前建议补充 ${gaps.join("、")} 的项目证据。` : "",
        ]
          .filter(Boolean)
          .join(""),
        profileVersion: profile.version,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
}

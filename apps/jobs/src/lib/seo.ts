import type { Job } from "@/types";

// Search metadata always points at the one public production origin. Preview and
// Vercel-generated domains must not become competing canonical URLs.
export const JOBS_ORIGIN = "https://jobs.horizonpivots.com";

const unknownLocations = new Set(["", "全球", "地点待确认", "远程"]);

const countryHints: Array<[string[], string]> = [
  [["香港", "Hong Kong"], "HK"],
  [["澳门", "Macau", "Macao"], "MO"],
  [["台湾", "Taiwan", "台北"], "TW"],
  [["新加坡", "Singapore"], "SG"],
  [["日本", "Japan", "东京", "大阪"], "JP"],
  [["韩国", "South Korea", "首尔"], "KR"],
  [["美国", "United States", "USA", "纽约", "硅谷", "西雅图"], "US"],
  [["英国", "United Kingdom", "UK", "伦敦"], "GB"],
  [["加拿大", "Canada", "多伦多", "温哥华"], "CA"],
  [["澳大利亚", "Australia", "悉尼", "墨尔本"], "AU"],
  [["德国", "Germany", "柏林", "慕尼黑"], "DE"],
  [["法国", "France", "巴黎"], "FR"],
  [["荷兰", "Netherlands", "阿姆斯特丹"], "NL"],
  [["瑞士", "Switzerland", "苏黎世"], "CH"],
  [["阿联酋", "United Arab Emirates", "迪拜"], "AE"],
  [["津巴布韦", "Zimbabwe"], "ZW"],
];

function countryCodeForLocation(location: string) {
  for (const [hints, code] of countryHints) {
    if (hints.some((hint) => location.toLocaleLowerCase().includes(hint.toLocaleLowerCase()))) {
      return code;
    }
  }
  return "CN";
}

export function jobCanonicalUrl(id: string) {
  return `${JOBS_ORIGIN}/jobs/${encodeURIComponent(id)}`;
}

export function jobMetaDescription(job: Job) {
  const locations = job.locations.slice(0, 3).join("、") || "地点待确认";
  const text = `${job.company}招聘${job.title}，${job.type}，面向${job.cohort}，工作地点：${locations}。${job.summary}`;
  return text.length > 155 ? `${text.slice(0, 154).trimEnd()}…` : text;
}

export function buildJobStructuredData(job: Job) {
  const url = jobCanonicalUrl(job.id);
  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "校招雷达", item: JOBS_ORIGIN },
      { "@type": "ListItem", position: 2, name: "岗位库", item: `${JOBS_ORIGIN}/jobs` },
      { "@type": "ListItem", position: 3, name: `${job.company} ${job.title}`, item: url },
    ],
  };

  const jobLocations = job.locations
    .map((location) => location.trim())
    .filter((location) => !unknownLocations.has(location))
    .map((location) => {
      const nationwide = location === "全国" || location === "多地";
      return {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          ...(!nationwide ? { addressLocality: location } : {}),
          addressCountry: countryCodeForLocation(location),
        },
      };
    });
  const description = job.description?.trim();

  // Google requires a complete description, a way to apply, and a physical
  // location. Incomplete records remain indexable web pages, but are not
  // presented as JobPosting rich-result candidates.
  if (!description || !job.applyUrl || !jobLocations.length) {
    return {
      "@context": "https://schema.org",
      "@graph": [breadcrumb],
    };
  }

  const posting: Record<string, unknown> = {
    "@type": "JobPosting",
    "@id": `${url}#job-posting`,
    title: job.title,
    description,
    datePosted: job.firstSeen,
    employmentType: job.type === "实习" ? "INTERN" : "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
    },
    identifier: {
      "@type": "PropertyValue",
      name: job.company,
      value: job.id,
    },
    industry: job.industry,
    skills: job.skills.join("、") || undefined,
    directApply: false,
    url,
    mainEntityOfPage: url,
  };

  if (job.deadline) posting.validThrough = `${job.deadline}T23:59:59+08:00`;
  posting.jobLocation = jobLocations;

  return {
    "@context": "https://schema.org",
    "@graph": [breadcrumb, posting],
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

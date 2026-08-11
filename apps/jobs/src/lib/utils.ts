import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "from",
    ].forEach((key) => url.searchParams.delete(key));
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function slugifyFingerprint(parts: Array<string | string[] | null | undefined>) {
  const source = parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .filter(Boolean)
    .map((part) => String(part).trim().toLocaleLowerCase())
    .join("|");

  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `job_${(hash >>> 0).toString(36)}`;
}

export function formatDate(value?: string | null) {
  if (!value) return "长期开放";
  const date = new Date(`${value}T00:00:00+08:00`);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function daysUntil(value?: string | null, from = new Date()) {
  if (!value) return null;
  const deadline = new Date(`${value}T23:59:59+08:00`);
  return Math.ceil((deadline.getTime() - from.getTime()) / 86_400_000);
}

export function isExpired(value?: string | null, from = new Date()) {
  if (!value) return false;
  const deadline = new Date(`${value}T23:59:59+08:00`);
  return deadline.getTime() < from.getTime();
}

export function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function toJobSearchText(job: {
  company: string;
  title: string;
  industry: string;
  locations: string[];
  skills: string[];
  summary: string;
  description?: string;
}) {
  return [
    job.company,
    job.title,
    job.industry,
    job.locations.join(" "),
    job.skills.join(" "),
    job.summary,
    job.description ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase();
}

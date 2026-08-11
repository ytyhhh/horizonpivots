import type { Institution } from "@/lib/types";

type BraveResult = { title?: string; url?: string; description?: string };

const isOfficialDomain = (url: string, domain: string) => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
};

export async function findOfficialProfile(name: string, institution: Institution) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return null;

  const query = `site:${institution.domain} "${name}" professor faculty`;
  const params = new URLSearchParams({ q: query, count: "5", safesearch: "strict" });
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as { web?: { results?: BraveResult[] } };
  const official = payload.web?.results?.find(
    (result) => result.url && isOfficialDomain(result.url, institution.domain),
  );
  if (!official?.url) return null;

  const text = `${official.title ?? ""} ${official.description ?? ""}`;
  const professor = /\b(assistant|associate|full|research)?\s*professor\b/i.exec(text)?.[0];
  const notAccepting = /not\s+(accepting|taking)\s+(new\s+)?(students|phd)/i.test(text);
  const accepting = /accepting\s+(new\s+)?(students|phd)|positions?\s+available|join\s+(the|our)\s+(lab|group)/i.test(text);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];

  return {
    url: official.url,
    title: professor ? professor.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Faculty profile",
    excerpt: official.description ?? "Official university profile",
    email,
    admissionStatus: notAccepting ? "not_accepting" : accepting ? "accepting" : "unknown",
  } as const;
}

import type { Publication } from "@/lib/types";

type SemanticScholarPaper = {
  paperId: string;
  title?: string;
  year?: number;
  url?: string;
  abstract?: string;
  s2FieldsOfStudy?: Array<{ category?: string }>;
  externalIds?: { DOI?: string };
} | null;

const endpoint = "https://api.semanticscholar.org/graph/v1";

const extractDoi = (url: string) => {
  const value = url.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").trim();
  return value.startsWith("10.") ? value.toLowerCase() : null;
};

export async function enrichWithSemanticScholar(publications: Publication[]) {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  if (!apiKey || publications.length === 0) return publications;

  const uniqueDois = Array.from(
    new Set(publications.map((publication) => extractDoi(publication.url)).filter((doi): doi is string => Boolean(doi))),
  );
  if (uniqueDois.length === 0) return publications;

  try {
    const fields = "paperId,title,year,url,abstract,s2FieldsOfStudy,externalIds";
    const response = await fetch(`${endpoint}/paper/batch?fields=${fields}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ ids: uniqueDois.map((doi) => `DOI:${doi}`) }),
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 2592000 },
    });
    if (!response.ok) return publications;
    const papers = (await response.json()) as SemanticScholarPaper[];
    const byDoi = new Map(
      papers
        .filter((paper): paper is Exclude<SemanticScholarPaper, null> => Boolean(paper?.externalIds?.DOI))
        .map((paper) => [paper.externalIds!.DOI!.toLowerCase(), paper]),
    );

    return publications.map((publication) => {
      const doi = extractDoi(publication.url);
      const paper = doi ? byDoi.get(doi) : undefined;
      if (!paper) return publication;
      return {
        ...publication,
        abstract: paper.abstract || undefined,
        semanticScholarUrl: paper.url,
        topic: publication.topic || paper.s2FieldsOfStudy?.[0]?.category,
      };
    });
  } catch {
    return publications;
  }
}

import { findOfficialProfile } from "@/lib/brave";
import { getInstitution } from "@/data/institutions";
import { calculateBreakdown, termAppears, tokenizeQuery, weightedScore } from "@/lib/scoring";
import { structureAcademicQuery } from "@/lib/siliconflow";
import { enrichWithSemanticScholar } from "@/lib/semantic-scholar";
import type { FacultyRecommendation, Publication, SearchQuery } from "@/lib/types";

type OpenAlexInstitution = { id: string; display_name: string };
type OpenAlexAuthorship = {
  author_position: "first" | "middle" | "last";
  is_corresponding: boolean;
  author: { id: string; display_name: string };
  institutions: OpenAlexInstitution[];
};
type OpenAlexWork = {
  id: string;
  doi?: string;
  title: string;
  publication_year: number;
  primary_topic?: { display_name?: string };
  authorships: OpenAlexAuthorship[];
};
type OpenAlexAuthor = {
  id: string;
  last_known_institutions?: OpenAlexInstitution[];
};

type Candidate = {
  authorId: string;
  name: string;
  works: Publication[];
};

const OPENALEX = "https://api.openalex.org";

const relevantReason = (publications: Publication[], query: SearchQuery) => {
  const corpus = publications.map((publication) => publication.title).join(" ");
  const hits = tokenizeQuery(query).filter((term) => termAppears(corpus, term)).slice(0, 3);
  if (hits.length > 0) return `近期论文与 ${hits.join("、")} 直接相关`;
  return "近期论文主题与检索方向存在交集";
};

const chunks = <T,>(items: T[], size: number) => {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size));
  return output;
};

const currentAuthorsAtInstitution = async (authors: Candidate[], institutionId: string) => {
  if (authors.length === 0) return new Set<string>();
  const params = new URLSearchParams({
    filter: `openalex:${authors.map((author) => author.authorId).join("|")}`,
    select: "id,last_known_institutions",
    "per-page": String(authors.length),
    mailto: "research@phdscope.local",
  });
  const response = await fetch(`${OPENALEX}/authors?${params}`, {
    headers: { "User-Agent": "PhDScope/0.1 (mailto:research@phdscope.local)" },
    signal: AbortSignal.timeout(12000),
    next: { revalidate: 604800 },
  });
  if (!response.ok) throw new Error(`OpenAlex affiliation check returned ${response.status}`);
  const payload = (await response.json()) as { results?: OpenAlexAuthor[] };
  return new Set(
    (payload.results ?? [])
      .filter((author) => author.last_known_institutions?.some((item) => item.id.endsWith(institutionId)))
      .map((author) => author.id.split("/").at(-1) ?? author.id),
  );
};

export async function discoverFaculty(
  institutionId: string,
  query: SearchQuery,
  onProgress?: (stage: "discovering" | "verifying", discovered: number, verified: number) => void,
): Promise<FacultyRecommendation[]> {
  const institution = getInstitution(institutionId);
  if (!institution) throw new Error("Unsupported institution");

  onProgress?.("discovering", 0, 0);
  const structuredSearch = await structureAcademicQuery(query);
  const searchTexts = Array.from(
    new Set([structuredSearch, ...query.researchKeywords.map((keyword) => keyword.trim()).filter(Boolean)]),
  ).slice(0, 4);
  const works: OpenAlexWork[] = [];
  for (const batch of chunks(searchTexts, 2)) {
    const payloads = await Promise.all(batch.map(async (searchText) => {
      const params = new URLSearchParams({
        filter: `institutions.id:${institution.id},from_publication_date:2021-01-01`,
        search: searchText,
        "per-page": "30",
        select: "id,doi,title,publication_year,primary_topic,authorships",
        mailto: "research@phdscope.local",
      });
      const response = await fetch(`${OPENALEX}/works?${params}`, {
        headers: { "User-Agent": "PhDScope/0.1 (mailto:research@phdscope.local)" },
        signal: AbortSignal.timeout(15000),
        next: { revalidate: 86400 },
      });
      if (!response.ok) throw new Error(`OpenAlex returned ${response.status}`);
      return (await response.json()) as { results?: OpenAlexWork[] };
    }));
    works.push(...payloads.flatMap((payload) => payload.results ?? []));
  }
  const candidateMap = new Map<string, Candidate>();

  for (const work of works) {
    for (const authorship of work.authorships ?? []) {
      const belongsToSchool = authorship.institutions.some((item) => item.id.endsWith(institution.id));
      const likelySenior = authorship.is_corresponding || authorship.author_position === "last";
      if (!belongsToSchool || !likelySenior || !authorship.author?.id) continue;

      const authorId = authorship.author.id.split("/").at(-1) ?? authorship.author.id;
      const current = candidateMap.get(authorId) ?? {
        authorId,
        name: authorship.author.display_name,
        works: [],
      };
      if (!current.works.some((item) => item.id === work.id)) {
        current.works.push({
          id: work.id.split("/").at(-1) ?? work.id,
          title: work.title,
          year: work.publication_year,
          url: work.doi || work.id,
          topic: work.primary_topic?.display_name,
        });
      }
      candidateMap.set(authorId, current);
    }
  }

  const preliminaryTopicFit = (candidate: Candidate) => calculateBreakdown({
    titles: candidate.works.map((work) => work.title),
    years: candidate.works.map((work) => work.year),
    query,
    officiallyVerified: false,
    recruitingSignal: false,
  }).topicFit;
  const initialCandidates = [...candidateMap.values()]
    .sort((a, b) => preliminaryTopicFit(b) - preliminaryTopicFit(a) || b.works.length - a.works.length)
    .slice(0, 48);
  const currentAuthorIds = await currentAuthorsAtInstitution(initialCandidates, institution.id);
  const candidates = initialCandidates
    .filter((candidate) => currentAuthorIds.has(candidate.authorId))
    .slice(0, 16);
  const enrichedPublications = await enrichWithSemanticScholar(candidates.flatMap((candidate) => candidate.works));
  const enrichedById = new Map(enrichedPublications.map((publication) => [publication.id, publication]));
  for (const candidate of candidates) {
    candidate.works = candidate.works.map((publication) => enrichedById.get(publication.id) ?? publication);
  }
  onProgress?.("verifying", candidates.length, 0);

  const recommendations: FacultyRecommendation[] = [];
  let verifiedCount = 0;

  for (const batch of chunks(candidates, 2)) {
    const batchResults = await Promise.all(
      batch.map(async (candidate): Promise<FacultyRecommendation> => {
        const official = await findOfficialProfile(candidate.name, institution).catch(() => null);
        if (official) verifiedCount += 1;
        const publications = candidate.works
          .sort((a, b) => b.year - a.year)
          .slice(0, 5);
        const scoreBreakdown = calculateBreakdown({
          titles: publications.map((item) => `${item.title} ${item.abstract ?? ""}`),
          years: publications.map((item) => item.year),
          query,
          officiallyVerified: Boolean(official),
          recruitingSignal: official?.admissionStatus === "accepting",
        });
        const topicNames = Array.from(new Set(publications.map((item) => item.topic).filter(Boolean)));

        return {
          id: `${institution.id}:${candidate.authorId}`,
          authorId: candidate.authorId,
          name: candidate.name,
          institutionId: institution.id,
          institutionName: institution.name,
          title: official?.title || "Academic author, role not yet verified",
          officialProfileUrl: official?.url,
          openAlexUrl: `${OPENALEX}/authors/${candidate.authorId}`,
          email: official?.email,
          matchScore: weightedScore(scoreBreakdown),
          scoreBreakdown,
          matchReasons: [
            relevantReason(publications, query),
            `${publications.length} 篇近年相关成果进入本次匹配`,
            official ? "已找到学校官方页面" : "当前隶属来自 OpenAlex，仍需官网核验",
          ],
          researchSummary: topicNames.length
            ? `近期研究涉及 ${topicNames.slice(0, 3).join("、")}`
            : `近期成果集中于 ${query.doctoralField}`,
          publications,
          evidence: [
            ...(official
              ? [{
                  label: "学校官方页面",
                  url: official.url,
                  source: "official" as const,
                  verifiedAt: new Date().toISOString(),
                  excerpt: official.excerpt,
                }]
              : []),
            {
              label: "OpenAlex 作者与论文记录",
              url: `${OPENALEX}/authors/${candidate.authorId}`,
              source: "openalex" as const,
              verifiedAt: new Date().toISOString(),
            },
            ...(publications.find((publication) => publication.semanticScholarUrl)
              ? [{
                  label: "Semantic Scholar 论文记录",
                  url: publications.find((publication) => publication.semanticScholarUrl)!.semanticScholarUrl!,
                  source: "semantic-scholar" as const,
                  verifiedAt: new Date().toISOString(),
                }]
              : []),
          ],
          admissionStatus: official?.admissionStatus ?? "unknown",
          verification: official ? "official" : "academic_graph",
        };
      }),
    );
    recommendations.push(...batchResults);
    onProgress?.("verifying", candidates.length, verifiedCount);
  }

  return recommendations;
}

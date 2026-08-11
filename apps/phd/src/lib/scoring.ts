import type { FacultyRecommendation, ScoreBreakdown, SearchQuery } from "@/lib/types";

const STOP_WORDS = new Set([
  "about", "after", "also", "among", "and", "are", "based", "been", "being", "between",
  "both", "can", "could", "for", "from", "have", "into", "its", "more", "our", "research",
  "study", "such", "than", "that", "the", "their", "these", "this", "through", "toward", "using",
  "was", "were", "what", "when", "where", "which", "while", "with", "would", "your",
]);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .trim();

const splitTerms = (value: string) =>
  normalize(value)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const stem = (term: string) => {
  if (term.length < 6) return term;
  return term
    .replace(/(izations?|isation|ments?|ness|ities|ity)$/i, "")
    .replace(/(ing|ed|es|s)$/i, "");
};

export const termAppears = (corpus: string, term: string) => {
  const normalizedCorpus = normalize(corpus);
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return false;
  if (normalizedCorpus.includes(normalizedTerm)) return true;
  const root = stem(normalizedTerm);
  return root.length >= 4 && root !== normalizedTerm && normalizedCorpus.includes(root);
};

export const tokenizeQuery = (query: SearchQuery) => {
  const sources = [query.doctoralField, query.researchDescription, ...query.researchKeywords];
  return Array.from(new Set(splitTerms(sources.join(" "))));
};

const weightedTopicSignals = (query: SearchQuery) => {
  const weights = new Map<string, number>();
  const add = (term: string, weight: number) => weights.set(term, Math.max(weight, weights.get(term) ?? 0));

  for (const keyword of query.researchKeywords) {
    const phrase = normalize(keyword);
    if (phrase.includes(" ")) add(phrase, 4);
    for (const term of splitTerms(keyword)) add(term, 3);
  }
  for (const term of splitTerms(query.researchDescription)) add(term, 1);
  for (const term of splitTerms(query.doctoralField)) add(term, 0.4);
  return [...weights.entries()].map(([term, weight]) => ({ term, weight }));
};

export const calculateBreakdown = ({
  titles,
  years,
  query,
  officiallyVerified,
  recruitingSignal,
}: {
  titles: string[];
  years: number[];
  query: SearchQuery;
  officiallyVerified: boolean;
  recruitingSignal: boolean;
}): ScoreBreakdown => {
  const signals = weightedTopicSignals(query);
  const corpus = normalize(titles.join(" "));
  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const matchedWeight = signals
    .filter((signal) => termAppears(corpus, signal.term))
    .reduce((sum, signal) => sum + signal.weight, 0);
  const topicFit = totalWeight ? Math.min(100, 8 + (matchedWeight / totalWeight) * 92) : 45;

  const currentYear = new Date().getFullYear();
  const recentYears = new Set(years.filter((year) => year >= currentYear - 4));
  const researchContinuity = Math.min(100, 34 + recentYears.size * 15);

  const skillTerms = query.profile?.skills.map(normalize).filter(Boolean) ?? [];
  const methodsMatched = skillTerms.filter((term) => termAppears(corpus, term));
  const methodsFit = skillTerms.length
    ? Math.min(100, 28 + (methodsMatched.length / skillTerms.length) * 72)
    : 52;

  return {
    topicFit: Math.round(topicFit),
    researchContinuity: Math.round(researchContinuity),
    methodsFit: Math.round(methodsFit),
    advisorEligibility: officiallyVerified ? 100 : 42,
    recruitingSignal: recruitingSignal ? 100 : 50,
  };
};

export const weightedScore = (score: ScoreBreakdown) =>
  Math.round(
    score.topicFit * 0.55 +
      score.researchContinuity * 0.15 +
      score.methodsFit * 0.15 +
      score.advisorEligibility * 0.1 +
      score.recruitingSignal * 0.05,
  );

export const rerank = (items: FacultyRecommendation[]) =>
  [...items]
    .sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name))
    .slice(0, 20);

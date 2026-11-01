// Turns the keyword assistant's concept groups into a boolean query in the same style as the
// project's hand-written queries: terms inside a concept are OR'd, concepts are AND'd.
//   (Twitter OR "social media") AND ("crowd wisdom" OR "collective intelligence")

export type keywordTerm = {
  text: string;
  selected: boolean;
  source: "model" | "user";
};

export type keywordConcept = {
  id: string;
  label: string;
  terms: keywordTerm[];
};

const BARE_TERM = /^[A-Za-z0-9*]+$/;

// Single words (including truncations like tweet*) go in bare; anything with spaces, hyphens or
// slashes is quoted as a phrase so every datasource reads it as one term.
export const formatTerm = (text: string): string => {
  const term = text.replace(/"/g, "").replace(/\s+/g, " ").trim();
  if (!term) return "";
  return BARE_TERM.test(term) ? term : `"${term}"`;
};

export const buildBooleanQuery = (concepts: keywordConcept[]): string =>
  concepts
    .map((concept) => {
      const seen = new Set<string>();
      const terms = concept.terms
        .filter((term) => term.selected)
        .map((term) => formatTerm(term.text))
        .filter((term) => {
          const key = term.toLowerCase();
          if (!term || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      return terms.length ? `(${terms.join(" OR ")})` : "";
    })
    .filter(Boolean)
    .join(" AND ");

// Adds a user term unless the concept already has it (case-insensitive); an existing term that
// was switched off is switched back on instead of duplicated.
export const addTerm = (concept: keywordConcept, text: string): keywordConcept => {
  const term = text.replace(/\s+/g, " ").trim();
  if (!term) return concept;
  const existing = concept.terms.findIndex(
    (candidate) => candidate.text.toLowerCase() === term.toLowerCase()
  );
  if (existing >= 0) {
    return {
      ...concept,
      terms: concept.terms.map((candidate, index) =>
        index === existing ? { ...candidate, selected: true } : candidate
      ),
    };
  }
  return {
    ...concept,
    terms: [...concept.terms, { text: term, selected: true, source: "user" }],
  };
};

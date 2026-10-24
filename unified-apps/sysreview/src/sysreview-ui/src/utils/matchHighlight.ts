// Lexical evidence for why a paper matches a research question: which words in its
// title/abstract/keywords line up with the question's content words, and how closely.
// Deterministic and instant; it explains matches, it does not produce the relevance score.

export type queryTerm = {
  raw: string;
  spelling: string; // UK/US-normalized form
  stem: string;
};

export type matchKind = "exact" | "spelling" | "stem" | "partial";

export type textSegment = {
  text: string;
  weight?: number;
  kind?: matchKind;
  term?: string;
};

export const MATCH_WEIGHTS: Record<matchKind, number> = {
  exact: 1,
  spelling: 0.9,
  stem: 0.6,
  partial: 0.4,
};

const MIN_TERM_LENGTH = 4;
const MIN_STEM_LENGTH = 4;
const MIN_PARTIAL_LENGTH = 5;

const STOPWORDS = new Set(
  (
    "about above after again against all also among and any are because been before being " +
    "between both but can could did does doing down during each few for from further had has " +
    "have having here how into its itself just more most much must not now off once only other " +
    "our out over own same should some such than that the their them then there these they " +
    "this those through under until very was were what when where which while who whom why " +
    "will with would you your paper papers study studies review reviews research question " +
    "questions include includes included inclusion criteria criterion relevant address " +
    "addresses addressing based using used use via within without whether"
  ).split(" ")
);

// UK -> US spellings, compared after lower-casing. Applied to both sides, so the result is
// only ever used for comparison and never shown.
const SPELLING_RULES: Array<[RegExp, string]> = [
  [/isation(s?)$/, "ization$1"],
  [/ising$/, "izing"],
  [/ised$/, "ized"],
  [/iser(s?)$/, "izer$1"],
  [/ise$/, "ize"],
  [/yse$/, "yze"],
  [/ysing$/, "yzing"],
  [/ysed$/, "yzed"],
  [/([a-z]{2,})our(s|ed|ing|ite|ful)?$/, "$1or$2"],
  [/([a-z]{2,})tre(s?)$/, "$1ter$2"],
  [/ogue(s?)$/, "og$1"],
  [/lling$/, "ling"],
  [/lled$/, "led"],
];

export const normalizeSpelling = (word: string): string => {
  let result = word.toLowerCase();
  for (const [pattern, replacement] of SPELLING_RULES) {
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement);
      break;
    }
  }
  return result;
};

// Longest first; compound endings like "-ational" come off in parts over several passes.
const SUFFIXES = [
  "ments",
  "ment",
  "ities",
  "ity",
  "ions",
  "ion",
  "ings",
  "ing",
  "edly",
  "ied",
  "ies",
  "ed",
  "es",
  "ly",
  "al",
  "ive",
  "ize",
  "s",
  "e",
];

const stripSuffix = (word: string): string => {
  const suffix = SUFFIXES.find(
    (candidate) =>
      word.endsWith(candidate) && word.length - candidate.length >= MIN_STEM_LENGTH
  );
  return suffix ? word.slice(0, word.length - suffix.length) : word;
};

export const stem = (word: string): string => {
  let result = normalizeSpelling(word);
  for (let pass = 0; pass < 3; pass++) {
    const stripped = stripSuffix(result);
    if (stripped === result) break;
    result = stripped;
  }
  return result;
};

// Hyphens split words, so "crowd-sourced" matches "crowd" at full weight.
const WORD_PATTERN = /[A-Za-z][A-Za-z']*/g;

export const buildQueryTerms = (question?: string | null): queryTerm[] => {
  const seen = new Set<string>();
  const terms: queryTerm[] = [];
  (question || "").match(WORD_PATTERN)?.forEach((word) => {
    const raw = word.toLowerCase();
    if (raw.length < MIN_TERM_LENGTH || STOPWORDS.has(raw) || seen.has(raw)) return;
    seen.add(raw);
    terms.push({ raw, spelling: normalizeSpelling(raw), stem: stem(raw) });
  });
  return terms;
};

const isPartial = (a: string, b: string) => {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= MIN_PARTIAL_LENGTH && longer.startsWith(shorter);
};

type wordMatch = { weight: number; kind: matchKind; term: string };

export const matchWord = (word: string, terms: queryTerm[]): wordMatch | null => {
  const raw = word.toLowerCase();
  if (raw.length < MIN_TERM_LENGTH || STOPWORDS.has(raw)) return null;
  const spelling = normalizeSpelling(raw);
  const wordStem = stem(raw);
  let best: wordMatch | null = null;
  const consider = (kind: matchKind, term: queryTerm) => {
    const weight = MATCH_WEIGHTS[kind];
    if (!best || weight > best.weight) best = { weight, kind, term: term.raw };
  };
  for (const term of terms) {
    if (raw === term.raw) consider("exact", term);
    else if (spelling === term.spelling) consider("spelling", term);
    else if (wordStem === term.stem) consider("stem", term);
    else if (isPartial(wordStem, term.stem)) consider("partial", term);
  }
  return best;
};

// Splits text into plain and matched segments so the UI can wrap matches in <mark>.
export const highlightSegments = (
  text: string | null | undefined,
  terms: queryTerm[]
): textSegment[] => {
  const value = text || "";
  if (!value) return [];
  if (!terms.length) return [{ text: value }];
  const segments: textSegment[] = [];
  let cursor = 0;
  const pattern = new RegExp(WORD_PATTERN.source, "g");
  let found: RegExpExecArray | null;
  while ((found = pattern.exec(value)) !== null) {
    const match = matchWord(found[0], terms);
    if (!match) continue;
    if (found.index > cursor) segments.push({ text: value.slice(cursor, found.index) });
    segments.push({
      text: found[0],
      weight: match.weight,
      kind: match.kind,
      term: match.term,
    });
    cursor = found.index + found[0].length;
  }
  if (cursor < value.length) segments.push({ text: value.slice(cursor) });
  return segments;
};

export const matchSummary = (
  fields: Array<string | null | undefined>,
  terms: queryTerm[]
): Array<{ term: string; best: number; kind: matchKind; count: number }> => {
  const byTerm = new Map<string, { best: number; kind: matchKind; count: number }>();
  fields.forEach((field) =>
    highlightSegments(field, terms).forEach((segment) => {
      if (!segment.term || !segment.weight || !segment.kind) return;
      const current = byTerm.get(segment.term);
      if (!current) {
        byTerm.set(segment.term, { best: segment.weight, kind: segment.kind, count: 1 });
      } else {
        current.count += 1;
        if (segment.weight > current.best) {
          current.best = segment.weight;
          current.kind = segment.kind;
        }
      }
    })
  );
  return Array.from(byTerm.entries())
    .map(([term, value]) => ({ term, ...value }))
    .sort((a, b) => b.best - a.best || b.count - a.count);
};

// Rank among scored papers: #1 = highest score; equal scores share a rank.
export const rankByScore = (scores: Array<number | null | undefined>) => {
  const scored = scores.filter((score): score is number => typeof score === "number");
  const sorted = [...scored].sort((a, b) => b - a);
  const rankOf = (score: number) => sorted.findIndex((value) => value === score) + 1;
  return { total: scored.length, rankOf };
};

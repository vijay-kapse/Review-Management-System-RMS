import {
  buildQueryTerms,
  highlightSegments,
  matchWord,
  normalizeSpelling,
  rankByScore,
  stem,
} from "./matchHighlight";

const terms = (question: string) => buildQueryTerms(question);

describe("spelling variants", () => {
  it("treats US and UK spellings as the same word", () => {
    expect(normalizeSpelling("optimisation")).toBe(normalizeSpelling("optimization"));
    expect(normalizeSpelling("colour")).toBe(normalizeSpelling("color"));
    expect(normalizeSpelling("behaviour")).toBe(normalizeSpelling("behavior"));
    expect(normalizeSpelling("analyse")).toBe(normalizeSpelling("analyze"));
    expect(normalizeSpelling("centre")).toBe(normalizeSpelling("center"));
  });

  it("does not mangle short words that merely end in -our", () => {
    expect(normalizeSpelling("four")).toBe("four");
    expect(normalizeSpelling("hour")).toBe("hour");
  });
});

describe("matchWord", () => {
  it("weights exact > spelling variant > shared stem > partial", () => {
    const t = terms("optimization of operate processes");
    expect(matchWord("optimization", t)).toMatchObject({ kind: "exact", weight: 1 });
    expect(matchWord("optimisation", t)).toMatchObject({ kind: "spelling", weight: 0.9 });
    expect(matchWord("operational", t)).toMatchObject({ kind: "stem", weight: 0.6 });
  });

  it("gives a partial match reduced, not zero, weight", () => {
    const t = terms("operate");
    const match = matchWord("operational", t);
    expect(match).not.toBeNull();
    expect(match!.weight).toBeGreaterThan(0);
    expect(match!.weight).toBeLessThan(1);
  });

  it("matches inflections through the stem", () => {
    expect(stem("operating")).toBe(stem("operate"));
    expect(matchWord("predicting", terms("prediction"))).not.toBeNull();
  });

  it("ignores stopwords and unrelated words", () => {
    const t = terms("social media crowd wisdom");
    expect(matchWord("with", t)).toBeNull();
    expect(matchWord("banana", t)).toBeNull();
  });
});

describe("buildQueryTerms", () => {
  it("drops stopwords, short words and duplicates", () => {
    const raw = terms("What is the wisdom of the crowd? Crowd wisdom in social media")
      .map((t) => t.raw);
    expect(raw).toEqual(["wisdom", "crowd", "social", "media"]);
  });

  it("handles an empty question", () => {
    expect(terms("")).toEqual([]);
    expect(buildQueryTerms(null)).toEqual([]);
  });
});

describe("highlightSegments", () => {
  it("splits text around matches and keeps all of it", () => {
    const text = "Crowd wisdom on social media platforms.";
    const segments = highlightSegments(text, terms("crowd wisdom social media"));
    expect(segments.map((s) => s.text).join("")).toBe(text);
    expect(segments.filter((s) => s.weight).map((s) => s.text)).toEqual([
      "Crowd",
      "wisdom",
      "social",
      "media",
    ]);
  });

  it("returns plain text when there are no terms", () => {
    expect(highlightSegments("anything here", [])).toEqual([{ text: "anything here" }]);
  });

  it("returns nothing for empty text", () => {
    expect(highlightSegments(undefined, terms("crowd"))).toEqual([]);
  });
});

describe("rankByScore", () => {
  it("ranks the highest score first and shares ranks on ties", () => {
    const { total, rankOf } = rankByScore([0.1, 0.5, null, 0.5, 0.02]);
    expect(total).toBe(4);
    expect(rankOf(0.5)).toBe(1);
    expect(rankOf(0.1)).toBe(3);
    expect(rankOf(0.02)).toBe(4);
  });
});

describe("stemming", () => {
  it("reduces derived forms of the same root to one stem", () => {
    const root = stem("operate");
    ["operates", "operating", "operated", "operation", "operational"].forEach((word) =>
      expect(stem(word)).toBe(root)
    );
  });
});

describe("hyphenated words", () => {
  it("matches each part of a hyphenated word on its own", () => {
    const segments = highlightSegments("Crowd-sourced checking", terms("crowd"));
    expect(segments[0]).toMatchObject({ text: "Crowd", kind: "exact", weight: 1 });
  });
});

import { addTerm, buildBooleanQuery, formatTerm, keywordConcept } from "./keywordQuery";

const concept = (label: string, terms: Array<[string, boolean]>): keywordConcept => ({
  id: label,
  label,
  terms: terms.map(([text, selected]) => ({ text, selected, source: "model" })),
});

describe("formatTerm", () => {
  it("leaves single words and truncations bare", () => {
    expect(formatTerm("Twitter")).toBe("Twitter");
    expect(formatTerm("tweet*")).toBe("tweet*");
  });

  it("quotes phrases, hyphens and slashes", () => {
    expect(formatTerm("crowd wisdom")).toBe('"crowd wisdom"');
    expect(formatTerm("Li-ion")).toBe('"Li-ion"');
    expect(formatTerm("X/Twitter")).toBe('"X/Twitter"');
    expect(formatTerm('"diffusion cascade*"')).toBe('"diffusion cascade*"');
  });
});

describe("buildBooleanQuery", () => {
  it("ORs terms within a concept and ANDs concepts", () => {
    expect(
      buildBooleanQuery([
        concept("social media", [
          ["Twitter", true],
          ["social media", true],
        ]),
        concept("crowd wisdom", [["wisdom of crowds", true]]),
      ])
    ).toBe('(Twitter OR "social media") AND ("wisdom of crowds")');
  });

  it("drops unselected terms, empty concepts and duplicates", () => {
    expect(
      buildBooleanQuery([
        concept("a", [
          ["fast charging", true],
          ["Fast  charging", true],
          ["quick charge", false],
        ]),
        concept("b", [["degradation", false]]),
      ])
    ).toBe('("fast charging")');
  });

  it("is empty when nothing is selected", () => {
    expect(buildBooleanQuery([concept("a", [["x", false]])])).toBe("");
  });
});

describe("addTerm", () => {
  it("adds a user term", () => {
    const result = addTerm(concept("a", [["one", true]]), "  two words ");
    expect(result.terms[1]).toEqual({ text: "two words", selected: true, source: "user" });
  });

  it("reselects an existing term instead of duplicating it", () => {
    const result = addTerm(concept("a", [["Twitter", false]]), "twitter");
    expect(result.terms).toHaveLength(1);
    expect(result.terms[0].selected).toBe(true);
  });
});

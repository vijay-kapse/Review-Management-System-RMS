import { verdictFor } from "./relevanceVerdict";

describe("verdictFor", () => {
  it("is empty until the paper is scored", () => {
    expect(verdictFor(null)).toBeNull();
    expect(verdictFor(undefined)).toBeNull();
    expect(verdictFor(Number.NaN)).toBeNull();
  });

  it("follows the model's yes/no answer", () => {
    expect(verdictFor(1.2)).toMatchObject({ tone: "possible", label: "Possibly relevant" });
    expect(verdictFor(0)).toMatchObject({ tone: "possible" });
    expect(verdictFor(-0.4)).toMatchObject({ tone: "unclear" });
    expect(verdictFor(-1.5)).toMatchObject({ tone: "unclear" });
    expect(verdictFor(-1.51)).toMatchObject({ tone: "unlikely", label: "Likely not relevant" });
  });

  it("reports the model's own yes-confidence", () => {
    expect(verdictFor(0)!.yesConfidence).toBeCloseTo(0.5);
    expect(verdictFor(1.15)!.yesConfidence).toBeCloseTo(0.76, 2);
  });
});

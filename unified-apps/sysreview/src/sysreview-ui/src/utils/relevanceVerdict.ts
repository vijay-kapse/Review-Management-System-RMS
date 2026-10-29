// The model's own answer to "is this paper relevant to the review?", read from the
// yes-vs-no log-odds of its first answer token. Not calibrated to how often papers are
// actually relevant: it says what the model thinks, and the wording stays modest because
// on a project with finished human screening it was reliable at ruling papers out
// (about 1% of "likely not relevant" papers were included) but weak at confirming them.

export type verdictTone = "possible" | "unclear" | "unlikely";

export type relevanceVerdict = {
  label: string;
  tone: verdictTone;
  // The model's own confidence in "yes", 0-1. Not a probability of inclusion.
  yesConfidence: number;
};

// At or above 0 the model answers yes more than no.
export const POSSIBLE_FROM = 0;
// Below this the model clearly answers no.
export const UNLIKELY_BELOW = -1.5;

export const verdictFor = (logit?: number | null): relevanceVerdict | null => {
  if (typeof logit !== "number" || !Number.isFinite(logit)) return null;
  const yesConfidence = 1 / (1 + Math.exp(-logit));
  if (logit >= POSSIBLE_FROM)
    return { label: "Possibly relevant", tone: "possible", yesConfidence };
  if (logit < UNLIKELY_BELOW)
    return { label: "Likely not relevant", tone: "unlikely", yesConfidence };
  return { label: "Unclear", tone: "unclear", yesConfidence };
};

export const VERDICT_BADGE: Record<verdictTone, string> = {
  possible: "success",
  unclear: "warning",
  unlikely: "secondary",
};

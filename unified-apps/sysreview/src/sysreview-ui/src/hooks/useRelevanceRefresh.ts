import { useEffect, useRef } from "react";
import { resultType } from "../api/types";

const REFRESH_MS = 60000;

type scoreMap = Map<number, number | null>;

export const relevanceScoresById = (rows: resultType[]): scoreMap =>
  new Map(rows.map((row) => [row.resultId, row.relevanceScore ?? null]));

// Copies fresh scores onto rows already on screen, leaving every other field
// (category edits, selection, paging) untouched. Deduplicated project rows carry
// all their result ids and take the highest score among them.
export const withRelevanceScores = <T extends resultType>(
  rows: T[],
  scores: scoreMap,
): T[] =>
  rows.map((row) => {
    const ids: number[] = (row as any).duplicateResultIds || [row.resultId];
    const known = ids
      .map((id) => scores.get(id))
      .filter((score): score is number => typeof score === "number");
    const score = known.length ? Math.max(...known) : row.relevanceScore ?? null;
    return score === (row.relevanceScore ?? null)
      ? row
      : { ...row, relevanceScore: score };
  });

export const hasUnscored = (rows: resultType[]) =>
  rows.some((row) => typeof row.relevanceScore !== "number");

// While some papers are still waiting for the background relevance worker,
// re-fetch their scores every minute so the Suggested column fills in without
// a page reload. Stops once everything is scored; skips while the tab is hidden.
const useRelevanceRefresh = (active: boolean, refresh: () => Promise<void>) => {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      refreshRef.current().catch((e) => console.log(e));
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [active]);
};

export default useRelevanceRefresh;

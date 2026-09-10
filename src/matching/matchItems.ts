import type { StructuredLineItem } from "../types";
import { normalizeText, jaccardSimilarity } from "./similarity";

export type MatchConfidence = "exact" | "confirmed" | "uncertain";

export interface MatchedPair {
  type: "matched";
  original: StructuredLineItem;
  revised: StructuredLineItem;
  similarity: number;
  confidence: MatchConfidence;
}
export interface RemovedItem {
  type: "removed";
  original: StructuredLineItem;
}
export interface AddedItem {
  type: "added";
  revised: StructuredLineItem;
}
export type MatchResult = MatchedPair | RemovedItem | AddedItem;

/** Below this, two descriptions are treated as different items entirely. */
export const MATCH_THRESHOLD = 0.4;
/** At/above this, a match is confident enough to not flag identity as uncertain. */
export const CONFIRMED_THRESHOLD = 0.8;

/**
 * Matches line items between the original and revised offer, independent of
 * row order, and tolerant of item renaming. Two-pass strategy:
 *   1. Exact normalized-description matches are taken first (unambiguous).
 *   2. Remaining items are paired off greedily by descending similarity,
 *      down to MATCH_THRESHOLD. Anything left over is a removal or addition.
 */
export function matchItems(
  original: StructuredLineItem[],
  revised: StructuredLineItem[]
): MatchResult[] {
  const remainingOriginal = original.map((item, idx) => ({ item, idx }));
  const remainingRevised = revised.map((item, idx) => ({ item, idx }));
  const results: MatchResult[] = [];

  for (let i = remainingOriginal.length - 1; i >= 0; i--) {
    const o = remainingOriginal[i];
    const j = remainingRevised.findIndex(
      (r) => normalizeText(r.item.description) === normalizeText(o.item.description)
    );
    if (j !== -1) {
      results.push({
        type: "matched",
        original: o.item,
        revised: remainingRevised[j].item,
        similarity: 1,
        confidence: "exact",
      });
      remainingOriginal.splice(i, 1);
      remainingRevised.splice(j, 1);
    }
  }

  const candidates: { i: number; j: number; sim: number }[] = [];
  for (let i = 0; i < remainingOriginal.length; i++) {
    for (let j = 0; j < remainingRevised.length; j++) {
      const sim = jaccardSimilarity(
        remainingOriginal[i].item.description,
        remainingRevised[j].item.description
      );
      if (sim >= MATCH_THRESHOLD) candidates.push({ i, j, sim });
    }
  }
  candidates.sort((a, b) => b.sim - a.sim);

  const usedOriginal = new Set<number>();
  const usedRevised = new Set<number>();
  for (const c of candidates) {
    if (usedOriginal.has(c.i) || usedRevised.has(c.j)) continue;
    usedOriginal.add(c.i);
    usedRevised.add(c.j);
    results.push({
      type: "matched",
      original: remainingOriginal[c.i].item,
      revised: remainingRevised[c.j].item,
      similarity: c.sim,
      confidence: c.sim >= CONFIRMED_THRESHOLD ? "confirmed" : "uncertain",
    });
  }

  remainingOriginal.forEach((o, i) => {
    if (!usedOriginal.has(i)) results.push({ type: "removed", original: o.item });
  });
  remainingRevised.forEach((r, j) => {
    if (!usedRevised.has(j)) results.push({ type: "added", revised: r.item });
  });

  return results;
}

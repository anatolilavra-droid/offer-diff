export function normalizeText(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function tokenize(s: string): Set<string> {
  return new Set(normalizeText(s).split(/[^a-z0-9]+/).filter(Boolean));
}

/** Order-independent token-overlap similarity (Jaccard index), 0..1. Chosen
 * over plain Levenshtein because item names can be reworded and reordered
 * word-for-word (e.g. "Hex Bolt M8x40" -> "M8x40 Hex Head Bolt") while still
 * referring to the same item; Levenshtein penalizes word reordering heavily. */
export function jaccardSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

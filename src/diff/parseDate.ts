const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export interface ParsedDate {
  y: number;
  m: number;
  d: number;
}

/** Parses "2024-12-15" (ISO) or "December 15, 2024" (long form). Returns null
 * for anything else rather than guessing. */
export function parseDateFlexible(s: string): ParsedDate | null {
  const trimmed = s.trim();

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
  }

  const long = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/);
  if (long) {
    const monthIdx = MONTHS.indexOf(long[1].toLowerCase());
    if (monthIdx !== -1) {
      return { y: Number(long[3]), m: monthIdx + 1, d: Number(long[2]) };
    }
  }

  return null;
}

/**
 * Compares two "as printed" date strings for same-day equality, tolerant of
 * ISO vs long-form formatting differences. Falls back to normalized string
 * equality when a value doesn't match either known format, so an unparseable
 * date is still compared rather than silently ignored.
 */
export function dateEquals(a: string | null, b: string | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;

  const pa = parseDateFlexible(a);
  const pb = parseDateFlexible(b);
  if (pa && pb) {
    return pa.y === pb.y && pa.m === pb.m && pa.d === pb.d;
  }
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

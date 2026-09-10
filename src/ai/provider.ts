import type { StructuredOffer } from "../types";

export interface StructuringUsage {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Number of retried attempts before this call succeeded (0 = succeeded first try). */
  retries: number;
}

export interface StructuringResult {
  offer: StructuredOffer;
  usage: StructuringUsage;
}

export interface PageInput {
  pageNumber: number;
  text: string;
}

/**
 * Turns raw extracted PDF text into a StructuredOffer. Implementations must
 * transcribe values as printed and must NOT normalize dates, fix arithmetic,
 * or invent values — that is the deterministic diff engine's job, not the
 * AI's, so that the diff stays auditable and reproducible.
 */
export interface StructuringProvider {
  structureOffer(pages: PageInput[]): Promise<StructuringResult>;
}

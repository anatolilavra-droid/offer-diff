import { extractText } from "./pdf/extractText";
import type { StructuringProvider, StructuringUsage } from "./ai/provider";
import { computeDiff, DiffReport } from "./diff/computeDiff";
import type { StructuredOffer } from "./types";
import { MAX_PAGES, MAX_ITEMS } from "./scopeLimits";

export interface CompareResult {
  original: StructuredOffer | null;
  revised: StructuredOffer | null;
  diff: DiffReport;
  usage: { original: StructuringUsage; revised: StructuringUsage };
  timingMs: { extraction: number; structuring: number; diff: number; total: number };
  pageCount: { original: number; revised: number };
  scopeWarnings: string[];
}

export interface InputFile {
  fileName: string;
  data: Buffer;
}

const ZERO_USAGE: StructuringUsage = { provider: "none", model: "none", inputTokens: 0, outputTokens: 0, retries: 0 };

export async function compareOffers(
  provider: StructuringProvider,
  originalFile: InputFile,
  revisedFile: InputFile
): Promise<CompareResult> {
  const t0 = performance.now();

  const [origExtracted, revExtracted] = await Promise.all([
    extractText(originalFile.fileName, originalFile.data),
    extractText(revisedFile.fileName, revisedFile.data),
  ]);
  const t1 = performance.now();

  const pageCount = { original: origExtracted.pages.length, revised: revExtracted.pages.length };

  // Check the page-count scope limit BEFORE calling the AI step: it is knowable from
  // extraction alone, and this project's AI provider has a very tight free-tier quota
  // (see docs/cost.md) that an oversized PDF should not be allowed to burn through.
  const pageScopeErrors: string[] = [];
  if (pageCount.original > MAX_PAGES) {
    pageScopeErrors.push(`original document has ${pageCount.original} pages, above the supported limit of ${MAX_PAGES}.`);
  }
  if (pageCount.revised > MAX_PAGES) {
    pageScopeErrors.push(`revised document has ${pageCount.revised} pages, above the supported limit of ${MAX_PAGES}.`);
  }
  if (pageScopeErrors.length > 0) {
    const t = performance.now();
    return {
      original: null,
      revised: null,
      diff: {
        decline: true,
        declineReason: pageScopeErrors.join(" "),
        substantiveChanges: [],
        uncertainMatches: [],
        arithmeticDiscrepancies: [],
        hasNoSubstantiveChanges: false,
      },
      usage: { original: ZERO_USAGE, revised: ZERO_USAGE },
      timingMs: { extraction: t1 - t0, structuring: 0, diff: 0, total: t - t0 },
      pageCount,
      scopeWarnings: pageScopeErrors,
    };
  }

  const [origResult, revResult] = await Promise.all([
    provider.structureOffer(origExtracted.pages),
    provider.structureOffer(revExtracted.pages),
  ]);
  const t2 = performance.now();

  const diff = computeDiff(origResult.offer, revResult.offer);
  const t3 = performance.now();

  // The line-item-count scope limit can only be known after structuring (item count comes
  // from the AI's extraction), so it is necessarily checked after that call, not before.
  const itemScopeErrors: string[] = [];
  for (const [label, offer] of [
    ["original", origResult.offer],
    ["revised", revResult.offer],
  ] as const) {
    if (offer.items.length > MAX_ITEMS) {
      itemScopeErrors.push(`${label} document has ${offer.items.length} line items, above the supported limit of ${MAX_ITEMS}.`);
    }
  }

  return {
    original: origResult.offer,
    revised: revResult.offer,
    diff,
    usage: { original: origResult.usage, revised: revResult.usage },
    timingMs: {
      extraction: t1 - t0,
      structuring: t2 - t1,
      diff: t3 - t2,
      total: t3 - t0,
    },
    pageCount,
    scopeWarnings: itemScopeErrors,
  };
}

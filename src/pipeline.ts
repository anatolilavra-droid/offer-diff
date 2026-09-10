import { extractText } from "./pdf/extractText";
import type { StructuringProvider, StructuringUsage } from "./ai/provider";
import { computeDiff, DiffReport } from "./diff/computeDiff";
import type { StructuredOffer } from "./types";

export interface CompareResult {
  original: StructuredOffer;
  revised: StructuredOffer;
  diff: DiffReport;
  usage: { original: StructuringUsage; revised: StructuringUsage };
  timingMs: { extraction: number; structuring: number; diff: number; total: number };
  pageCount: { original: number; revised: number };
}

export interface InputFile {
  fileName: string;
  data: Buffer;
}

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

  const [origResult, revResult] = await Promise.all([
    provider.structureOffer(origExtracted.pages),
    provider.structureOffer(revExtracted.pages),
  ]);
  const t2 = performance.now();

  const diff = computeDiff(origResult.offer, revResult.offer);
  const t3 = performance.now();

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
    pageCount: { original: origExtracted.pages.length, revised: revExtracted.pages.length },
  };
}

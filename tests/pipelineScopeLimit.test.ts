import { test } from "node:test";
import assert from "node:assert/strict";
import PDFDocument from "pdfkit";
import { compareOffers } from "../src/pipeline";
import { MockRegexStructuringProvider } from "../src/ai/mockProvider";
import { MAX_PAGES } from "../src/scopeLimits";

/** A minimal PDF with a controlled, known page count -- avoids depending on
 * renderOffer()'s natural text-overflow pagination, which isn't precise. */
function makePdfWithPages(pageCount: number): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.text("page 1");
  for (let i = 1; i < pageCount; i++) {
    doc.addPage();
    doc.text(`page ${i + 1}`);
  }
  doc.end();
  return done;
}

test("compareOffers declines an over-the-page-limit PDF without calling the AI provider", async () => {
  const tooManyPages = MAX_PAGES + 1;
  const pdfBuffer = await makePdfWithPages(tooManyPages);

  let structureOfferCalls = 0;
  const provider = new MockRegexStructuringProvider();
  const spyProvider = {
    structureOffer: (...args: Parameters<typeof provider.structureOffer>) => {
      structureOfferCalls++;
      return provider.structureOffer(...args);
    },
  };

  const result = await compareOffers(
    spyProvider,
    { fileName: "a.pdf", data: pdfBuffer },
    { fileName: "b.pdf", data: pdfBuffer }
  );

  assert.equal(structureOfferCalls, 0, "the AI provider must not be called for an over-limit PDF");
  assert.equal(result.diff.decline, true);
  assert.match(result.diff.declineReason ?? "", new RegExp(`above the supported limit of ${MAX_PAGES}`));
  assert.equal(result.timingMs.structuring, 0);
  assert.equal(result.original, null);
  assert.equal(result.revised, null);
});

test("compareOffers proceeds normally for a PDF within the page limit", async () => {
  const pdfBuffer = await makePdfWithPages(1);
  const provider = new MockRegexStructuringProvider();

  const result = await compareOffers(provider, { fileName: "a.pdf", data: pdfBuffer }, { fileName: "b.pdf", data: pdfBuffer });

  assert.equal(result.diff.decline, false);
  assert.equal(result.pageCount.original, 1);
});

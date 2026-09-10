import type { PageInput, StructuringProvider, StructuringResult } from "./provider";
import type { StructuredOffer, StructuredLineItem, FieldRef } from "../types";

const ITEM_LINE = /^(.+?)\s+(\d+)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/;
const GRAND_TOTAL_LINE = /^Grand Total \(([^)]+)\):\s*([\d,]+\.\d{2})$/i;
const OFFER_NUMBER_LINE = /^Offer Number:\s*(.+)$/i;
const OFFER_DATE_LINE = /^Offer Date:\s*(.+)$/i;
const DELIVERY_DATE_LINE = /^Delivery Date:\s*(.+)$/i;
const CURRENCY_LINE = /^Currency:\s*(.+)$/i;
const HEADER_LINE = /^Description\s+Qty\s+Unit Price\s+Line Total$/i;

function parseNum(s: string): number {
  return Number(s.replace(/,/g, ""));
}

/**
 * A deterministic, regex-based stand-in for the AI structuring step. It only
 * understands the exact fixed table layout this project's own PDF generator
 * produces ("Description Qty Unit Price Line Total" columns, "Key: value"
 * header lines). It exists solely so the rest of the pipeline (matching,
 * diffing, API, UI) can be built and demonstrated end-to-end without a
 * funded Anthropic API key.
 *
 * IMPORTANT: this is not a substitute for the real AI step on the "difficult
 * inputs" requirement — a real commercial offer PDF from an unknown vendor
 * will not follow this exact layout, and this parser will fail or
 * mis-extract it silently. ClaudeStructuringProvider (src/ai/claudeProvider.ts)
 * is the intended implementation; swap it in once an API key is available.
 */
export class MockRegexStructuringProvider implements StructuringProvider {
  async structureOffer(pages: PageInput[]): Promise<StructuringResult> {
    let docTitle = "";
    let offerNumber: string | null = null;
    let offerDate: string | null = null;
    let offerDateRef: FieldRef | null = null;
    let deliveryDate: string | null = null;
    let deliveryDateRef: FieldRef | null = null;
    let currency = "";
    let printedGrandTotal: number | null = null;
    let grandTotalRef: FieldRef | null = null;
    const items: StructuredLineItem[] = [];

    for (const page of pages) {
      const lines = page.text.split("\n").map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        let m: RegExpMatchArray | null;

        if (!docTitle && !/^(Offer Number|Offer Date|Delivery Date|Currency):/i.test(line)) {
          docTitle = line;
          continue;
        }
        if ((m = line.match(OFFER_NUMBER_LINE))) {
          offerNumber = m[1].trim();
          continue;
        }
        if ((m = line.match(OFFER_DATE_LINE))) {
          offerDate = m[1].trim();
          offerDateRef = { page: page.pageNumber, snippet: line };
          continue;
        }
        if ((m = line.match(DELIVERY_DATE_LINE))) {
          deliveryDate = m[1].trim();
          deliveryDateRef = { page: page.pageNumber, snippet: line };
          continue;
        }
        if ((m = line.match(CURRENCY_LINE))) {
          currency = m[1].trim();
          continue;
        }
        if (HEADER_LINE.test(line)) continue;
        if ((m = line.match(GRAND_TOTAL_LINE))) {
          printedGrandTotal = parseNum(m[2]);
          grandTotalRef = { page: page.pageNumber, snippet: line };
          continue;
        }
        if ((m = line.match(ITEM_LINE))) {
          items.push({
            description: m[1].trim(),
            quantity: parseNum(m[2]),
            unitPrice: parseNum(m[3]),
            printedLineTotal: parseNum(m[4]),
            ref: { page: page.pageNumber, snippet: line },
          });
          continue;
        }
      }
    }

    const offer: StructuredOffer = {
      docTitle,
      offerNumber,
      currency,
      offerDate,
      offerDateRef,
      deliveryDate,
      deliveryDateRef,
      items,
      printedGrandTotal,
      grandTotalRef,
    };

    return {
      offer,
      usage: { provider: "mock", model: "regex-mock-v1", inputTokens: 0, outputTokens: 0, retries: 0 },
    };
  }
}

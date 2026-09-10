import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDiff } from "../src/diff/computeDiff";
import type { StructuredOffer, StructuredLineItem } from "../src/types";

function item(description: string, quantity: number, unitPrice: number, printedLineTotal: number): StructuredLineItem {
  return { description, quantity, unitPrice, printedLineTotal, ref: { page: 1, snippet: description } };
}

function offer(overrides: Partial<StructuredOffer>): StructuredOffer {
  return {
    docTitle: "Commercial Offer",
    offerNumber: "OFR-1",
    currency: "USD",
    offerDate: "2024-11-03",
    offerDateRef: { page: 1, snippet: "Offer Date: 2024-11-03" },
    deliveryDate: "2024-12-15",
    deliveryDateRef: { page: 1, snippet: "Delivery Date: 2024-12-15" },
    items: [],
    printedGrandTotal: null,
    grandTotalRef: null,
    ...overrides,
  };
}

test("currency mismatch declines instead of comparing amounts", () => {
  const original = offer({ currency: "USD", items: [item("A", 1, 10, 10)], printedGrandTotal: 10 });
  const revised = offer({ currency: "EUR", items: [item("A", 1, 10, 10)], printedGrandTotal: 10 });
  const report = computeDiff(original, revised);
  assert.equal(report.decline, true);
  assert.match(report.declineReason ?? "", /Currency mismatch/);
});

test("quantity, price, removal and delivery-date changes are all detected with refs", () => {
  const original = offer({
    items: [item("Steel Bracket Type A", 100, 4.5, 450), item("Rubber Gasket Ring", 200, 1.2, 240)],
    printedGrandTotal: 690,
  });
  const revised = offer({
    deliveryDate: "2025-01-10",
    deliveryDateRef: { page: 1, snippet: "Delivery Date: 2025-01-10" },
    items: [item("Steel Bracket Type A", 120, 4.5, 540)],
    printedGrandTotal: 540,
  });
  const report = computeDiff(original, revised);
  assert.equal(report.decline, false);

  const fields = report.substantiveChanges.map((c) => c.field).sort();
  assert.deepEqual(fields, ["deliveryDate", "itemRemoved", "quantity"]);

  const qtyChange = report.substantiveChanges.find((c) => c.field === "quantity")!;
  assert.equal(qtyChange.before, 100);
  assert.equal(qtyChange.after, 120);
  assert.ok(qtyChange.originalRef && qtyChange.revisedRef, "quantity change must reference both sources");
});

test("formatting-only differences produce zero substantive changes", () => {
  const original = offer({
    items: [item("Steel Bracket Type A", 100, 4.5, 450)],
    printedGrandTotal: 450,
  });
  const revised = offer({
    deliveryDate: "December 15, 2024", // same date, long-form display
    deliveryDateRef: { page: 1, snippet: "Delivery Date: December 15, 2024" },
    items: [item("STEEL BRACKET TYPE A", 100, 4.5, 450)], // same item, upper case
    printedGrandTotal: 450,
  });
  const report = computeDiff(original, revised);
  assert.equal(report.decline, false);
  assert.equal(report.hasNoSubstantiveChanges, true, JSON.stringify(report.substantiveChanges));
  assert.equal(report.arithmeticDiscrepancies.length, 0);
});

test("wrong printed grand total is flagged as an arithmetic discrepancy, not silently fixed", () => {
  const revised = offer({
    items: [item("Steel Bracket Type A", 100, 4.5, 450), item("Aluminum Panel 2mm", 40, 22, 880)],
    printedGrandTotal: 2650, // true sum is 1330
    grandTotalRef: { page: 1, snippet: "Grand Total (USD): 2650.00" },
  });
  const original = offer({
    items: [item("Steel Bracket Type A", 100, 4.5, 450), item("Aluminum Panel 2mm", 40, 22, 880)],
    printedGrandTotal: 1330,
  });
  const report = computeDiff(original, revised);
  assert.equal(report.arithmeticDiscrepancies.length, 1);
  const disc = report.arithmeticDiscrepancies[0];
  assert.equal(disc.document, "revised");
  assert.equal(disc.statedTotal, 2650);
  assert.equal(disc.computedTotal, 1330);
  assert.equal(disc.difference, 1320);
});

test("renamed item with medium similarity is reported as an uncertain match, not a substantive change by itself", () => {
  const original = offer({ items: [item("Hex Bolt M8x40", 500, 0.35, 175)], printedGrandTotal: 175 });
  const revised = offer({ items: [item("M8x40 Hex Head Bolt", 500, 0.35, 175)], printedGrandTotal: 175 });
  const report = computeDiff(original, revised);
  assert.equal(report.substantiveChanges.length, 0, "rename alone with no qty/price change is not substantive");
  assert.equal(report.uncertainMatches.length, 1);
  assert.equal(report.uncertainMatches[0].originalDescription, "Hex Bolt M8x40");
});

import fs from "node:fs";
import path from "node:path";
import { renderOffer } from "../src/pdf/renderOffer";
import type { OfferGroundTruth } from "../src/types";

const ROOT = path.join(__dirname, "..", "test-set");

function baseline(): OfferGroundTruth {
  return {
    docTitle: "Commercial Offer",
    offerNumber: "OFR-2024-118",
    currency: "USD",
    offerDate: "2024-11-03",
    deliveryDate: "2024-12-15",
    items: [
      { description: "Steel Bracket Type A", quantity: 100, unitPrice: 4.5, printedLineTotal: 450.0 },
      { description: "Aluminum Panel 2mm", quantity: 40, unitPrice: 22.0, printedLineTotal: 880.0 },
      { description: "Hex Bolt M8x40", quantity: 500, unitPrice: 0.35, printedLineTotal: 175.0 },
      { description: "Rubber Gasket Ring", quantity: 200, unitPrice: 1.2, printedLineTotal: 240.0 },
      { description: "Powder Coating Service", quantity: 1, unitPrice: 650.0, printedLineTotal: 650.0 },
      { description: "Freight & Handling", quantity: 1, unitPrice: 300.0, printedLineTotal: 300.0 },
    ],
    printedGrandTotal: 2695.0,
  };
}

function writeScenario(
  name: string,
  original: OfferGroundTruth,
  revised: OfferGroundTruth,
  expectedDifferencesMd: string,
  renderOpts: { original?: Parameters<typeof renderOffer>[2]; revised?: Parameters<typeof renderOffer>[2] } = {}
) {
  const dir = path.join(ROOT, "input", name);
  fs.mkdirSync(dir, { recursive: true });
  renderOffer(original, path.join(dir, "original.pdf"), renderOpts.original);
  renderOffer(revised, path.join(dir, "revised.pdf"), renderOpts.revised);
  fs.writeFileSync(
    path.join(dir, "ground-truth.json"),
    JSON.stringify({ original, revised }, null, 2)
  );
  fs.writeFileSync(path.join(dir, "expected.md"), expectedDifferencesMd);
  console.log(`wrote ${dir}`);
}

// --- Scenario 1: normal — clear substantive changes, no renaming/reordering ---
{
  const original = baseline();
  const revised = baseline();
  revised.items = revised.items.map((it) => ({ ...it }));
  revised.items[0] = { ...revised.items[0], quantity: 120, printedLineTotal: 540.0 }; // qty change
  revised.items[1] = { ...revised.items[1], unitPrice: 24.5, printedLineTotal: 980.0 }; // price change
  revised.items.splice(3, 1); // remove "Rubber Gasket Ring"
  revised.deliveryDate = "2025-01-10"; // date change
  revised.printedGrandTotal = 540.0 + 980.0 + 175.0 + 650.0 + 300.0; // 2645.00, correct

  writeScenario(
    "normal",
    original,
    revised,
    `# Expected differences — normal

Category: normal input.

- Steel Bracket Type A: quantity 100 -> 120
- Aluminum Panel 2mm: unit price 22.00 -> 24.50 (line total 880.00 -> 980.00)
- Rubber Gasket Ring: removed
- Delivery date: 2024-12-15 -> 2025-01-10
- Grand total: 2695.00 -> 2645.00 (consistent with the sum of revised line items; no arithmetic discrepancy)
- No renamed/reordered items in this fixture.
- No uncertain matches expected.
`
  );
}

// --- Scenario 2: correction/ambiguity — rename + reorder + wrong printed total ---
{
  const original = baseline();
  const revised = baseline();
  revised.items = revised.items.map((it) => ({ ...it }));
  // rename + real quantity change on the same item
  revised.items[2] = {
    ...revised.items[2],
    description: "M8x40 Hex Head Bolt",
    quantity: 450,
    printedLineTotal: 157.5,
  };
  // reorder rows: swap the whole array order for printing (ground truth order stays canonical;
  // only the printed row order changes via renderOpts.rowOrder)
  const revisedRowOrder = [5, 1, 3, 0, 4, 2];
  // intentionally wrong printed grand total (true sum would be 2677.50)
  revised.printedGrandTotal = 2650.0;

  writeScenario(
    "ambiguity-reorder-badtotal",
    original,
    revised,
    `# Expected differences — correction/ambiguity

Category: correction or ambiguity.

- "Hex Bolt M8x40" renamed to "M8x40 Hex Head Bolt" — same item (must be matched despite
  rename and row reordering), quantity changed 500 -> 450 (line total 175.00 -> 157.50).
- Rows are printed in a different order in the revised document; order must not affect matching.
- True sum of revised line items = 450.00 + 880.00 + 157.50 + 240.00 + 650.00 + 300.00 = 2677.50.
- Revised document prints Grand Total = 2650.00 -> arithmetic discrepancy of 27.50 must be flagged,
  not silently corrected or ignored.
- All other items unchanged.
`,
    { revised: { rowOrder: revisedRowOrder } }
  );
}

// --- Scenario 3: decline — currency mismatch (violates the one-currency scope) ---
{
  const original = baseline();
  const revised = baseline();
  revised.currency = "EUR"; // same numbers, different currency -> out of stated scope

  writeScenario(
    "decline-currency-mismatch",
    original,
    revised,
    `# Expected differences — clarification/decline

Category: input on which the product should ask for clarification or decline to conclude.

- Original currency: USD. Revised currency: EUR.
- This violates the stated scope assumption (one currency per comparison).
- Expected product behavior: decline to produce a substantive comparison (or explicitly ask
  the user to confirm/resolve the currency mismatch) instead of comparing raw numbers as if
  they were the same currency.
`
  );
}

// --- Scenario 4: formatting-only — no substantive changes ---
{
  const original = baseline();
  const revised = baseline();
  revised.items = revised.items.map((it) => ({ ...it, description: it.description.toUpperCase() }));
  revised.deliveryDate = original.deliveryDate; // same date, different display format only

  writeScenario(
    "formatting-only",
    original,
    revised,
    `# Expected differences — formatting-only (no substantive changes)

Category: formatting-only variant required by the brief.

- Item descriptions are printed in upper case in the revised document (same items, same meaning).
- Delivery date is printed as a long-form date ("December 15, 2024") instead of ISO
  ("2024-12-15") — same date.
- Grand total is printed with thousands separators ("2,695.00") instead of plain ("2695.00") —
  same amount.
- No quantities, prices, items, or dates actually changed.
- Expected result: 0 substantive changes reported.
`,
    {
      revised: { headerCase: "upper", dateStyle: "long", numberStyle: "comma" },
    }
  );
}

console.log("done");

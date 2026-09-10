# Test set — expected vs actual

Reproduction:
```bash
npx tsx scripts/generateFixtures.ts   # regenerates test-set/input/* (deterministic)
npx tsx scripts/runTestSet.ts         # runs the pipeline on all 4 scenarios, prints actual results
npx tsx scripts/runOneScenario.ts normal   # runs a single scenario (useful under free-tier rate limits)
```

Expected results for every scenario were written to `test-set/input/<scenario>/expected.md`
at fixture-generation time, before the pipeline was ever run against them (see git history:
`generateFixtures.ts` writes both the PDFs and `expected.md` in the same pass).

**Update:** all 4 scenarios below were re-run with the real `GeminiStructuringProvider`
(model `gemini-2.5-flash`, Google AI Studio free tier) once a key became available. Real
per-run token usage and timing are recorded per scenario. The free tier's rate limit (5
requests/minute per model, confirmed directly from the API's own 429 error — see
`docs/cost.md`) meant the 4 comparisons (8 API calls) had to be split across two process
runs a few seconds apart rather than one batch. Results below are the real-AI results;
they are identical to the earlier mock-provider results in every field checked, which is
itself evidence that Gemini extracted the fixtures correctly (see "AI output check" note
at the end of this file).

## 1. normal — mandatory category: normal input

**Input:** `test-set/input/normal/{original,revised}.pdf` — quantity change, unit price
change, one item removed, delivery date changed.

**Expected** (`test-set/input/normal/expected.md`):
- Steel Bracket Type A: quantity 100 -> 120
- Aluminum Panel 2mm: unit price 22.00 -> 24.50
- Rubber Gasket Ring: removed
- Delivery date: 2024-12-15 -> 2025-01-10
- No arithmetic discrepancy, no uncertain matches

**Actual:**
```
substantiveChanges: 4
  - [unitPrice] Aluminum Panel 2mm: 22 -> 24.5
  - [quantity] Steel Bracket Type A: 100 -> 120
  - [itemRemoved] Rubber Gasket Ring: "Rubber Gasket Ring (qty 200 @ 1.2)" -> null
  - [deliveryDate] Delivery date: "2024-12-15" -> "2025-01-10"
uncertainMatches: 0
arithmeticDiscrepancies: 0
```

**Result: PASS** — all 4 expected changes detected, nothing extra, no false positives.

**Real Gemini call (2026-09-10):** original tokens in=297/out=814, revised tokens
in=276/out=690. Timing: extraction 1501.1ms (cold pdfjs init in this process),
structuring 7209.2ms, total 8711.3ms.

## 2. ambiguity-reorder-badtotal — mandatory category: correction/ambiguity

**Input:** `test-set/input/ambiguity-reorder-badtotal/{original,revised}.pdf` — one item
renamed + quantity-changed, all rows printed in a different order, printed grand total
intentionally wrong.

**Expected** (`test-set/input/ambiguity-reorder-badtotal/expected.md`):
- "Hex Bolt M8x40" -> "M8x40 Hex Head Bolt" matched despite rename+reorder, quantity 500 -> 450
- True sum = 2677.50; printed total = 2650.00 -> discrepancy of 27.50 must be flagged
- All other items unchanged

**Actual:**
```
substantiveChanges: 1
  - [quantity] M8x40 Hex Head Bolt: 500 -> 450
uncertainMatches: 1
  - "Hex Bolt M8x40" ~ "M8x40 Hex Head Bolt" (sim=0.75)
arithmeticDiscrepancies: 1
  - revised: stated=2650 computed=2677.5 diff=-27.5
```

**Result: PASS** — item matched across rename+reorder, quantity change correctly attributed
to it, arithmetic discrepancy detected with the exact expected magnitude (27.5). The renamed
identity itself is surfaced as an uncertain match (similarity 0.75) rather than a silent
assumption or a false "removed+added" pair.

**Real Gemini call (2026-09-10):** original tokens in=297/out=814, revised tokens
in=298/out=816. Timing: extraction 2096.0ms, structuring 9415.5ms, total 11512.6ms.

## 3. decline-currency-mismatch — mandatory category: clarification/decline

**Input:** `test-set/input/decline-currency-mismatch/{original,revised}.pdf` — identical
amounts, but original states USD and revised states EUR.

**Expected** (`test-set/input/decline-currency-mismatch/expected.md`):
- Product should decline to conclude rather than compare raw numbers across currencies.

**Actual:**
```
decline: true (Currency mismatch: original states "USD", revised states "EUR". Refusing to
compare amounts across different currencies (this tool assumes both documents use one
currency).)
```

**Result: PASS.**

**Real Gemini call (2026-09-10):** original tokens in=297/out=814, revised tokens
in=297/out=814. Timing: extraction 19.8ms (warm process), structuring 4992.8ms, total
5012.7ms. Note: the decline check runs before any AI-extracted currency comparison would
normally be needed for the numeric diff, but the structuring calls still ran (both
documents are still structured before the currency check in `computeDiff`), so real tokens
were consumed even though the result was a decline.

## 4. formatting-only — required by the brief (no substantive changes)

**Input:** `test-set/input/formatting-only/{original,revised}.pdf` — same items/amounts/dates,
only case, date format (ISO vs long-form), and thousands-separator formatting differ.

**Expected** (`test-set/input/formatting-only/expected.md`):
- 0 substantive changes.

**Actual:**
```
hasNoSubstantiveChanges: true
substantiveChanges: 0
arithmeticDiscrepancies: 0
```

**Result: PASS.**

**Real Gemini call (2026-09-10):** original tokens in=297/out=814, revised tokens
in=307/out=834. Timing: extraction 13.9ms (warm process), structuring 8228.9ms, total
8243.2ms. Confirms the AI step itself already normalizes case/date-format/thousands-separator
formatting into the same structured values as the plain-text original — the 0-substantive-
changes result is not solely an artifact of the mock parser.

## Summary

| Scenario | Category | Result |
|---|---|---|
| normal | normal input | PASS |
| ambiguity-reorder-badtotal | correction/ambiguity | PASS |
| decline-currency-mismatch | clarification/decline | PASS |
| formatting-only | required by brief | PASS |

4/4 pass with the real Gemini API. Missed changes: none observed. False changes: none
observed, on this fixture set. This is not a claim of general robustness — see
`docs/final-report.md` (Known limitations) for what this test set does and does not cover
(e.g. it does not include OCR/scanned input, which is explicitly out of scope per the brief).

## AI output check (required by the brief: "one example of how you checked their output")

The brief asks for a concrete example of how AI output was verified, not just trusted. Method
used here: every fixture's `ground-truth.json` (written by `generateFixtures.ts` before any
PDF existed) records the exact values used to render the PDF. After the real Gemini call, its
structured extraction was compared field-by-field against that ground truth for the `normal`
scenario:

| Field | Ground truth | Gemini extracted |
|---|---|---|
| original item 1 description | "Steel Bracket Type A" | "Steel Bracket Type A" — match |
| original item 1 quantity | 100 | 100 — match |
| revised item 1 quantity | 120 | 120 — match |
| revised item 2 unitPrice | 24.5 | 24.5 — match |
| original printedGrandTotal | 2695.0 | 2695 — match |
| revised deliveryDate (as printed) | "2025-01-10" | "2025-01-10" — match |
| item count after removal (revised) | 5 | 5 — match |

No discrepancy found between Gemini's extraction and the known-correct ground truth on this
scenario. This does not prove general reliability (see Known limitations) — it proves the
specific claim "the AI step's output was checked against a known-correct source, not assumed
correct," which is what the brief asks for.

# Test set — expected vs actual

Reproduction:
```bash
npx tsx scripts/generateFixtures.ts   # regenerates test-set/input/* (deterministic)
npx tsx scripts/runTestSet.ts         # runs the pipeline on all 4 scenarios, prints actual results
```

Expected results for every scenario were written to `test-set/input/<scenario>/expected.md`
at fixture-generation time, before the pipeline was ever run against them (see git history:
`generateFixtures.ts` writes both the PDFs and `expected.md` in the same pass).

All 4 runs below used `MockRegexStructuringProvider` (no funded Anthropic API key yet — see
`docs/cost.md` for the AI-step limitation this implies).

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

## Summary

| Scenario | Category | Result |
|---|---|---|
| normal | normal input | PASS |
| ambiguity-reorder-badtotal | correction/ambiguity | PASS |
| decline-currency-mismatch | clarification/decline | PASS |
| formatting-only | required by brief | PASS |

4/4 pass. Missed changes: none observed. False changes: none observed, on this fixture set.
This is not a claim of general robustness — see `docs/final-report.md` (Known limitations) for
what this test set does and does not cover (e.g. it does not include OCR/scanned input, which
is explicitly out of scope per the brief).

# Delivery notes — offer-diff

Compiled per the brief's requirement: "In your delivery notes include the sample inputs and
expected/actual results; what failed; time spent; exact AI tools and models and one example
of how you checked their output. Measure time to a useful result and the estimated variable
cost per operation... Name the pricing assumptions and separate hosting costs."

## Links

- **Repository:** https://github.com/anatolilavra-droid/offer-diff (private access; add
  collaborators as needed)
- **Working demo:** public URL pending deployment — `render.yaml` is committed and README →
  "Demo" has exact, tested steps for a free (no card) Render deploy. Until deployed, run
  locally: `npm install && cp .env.example .env && npm run dev`, then open
  `http://localhost:3000` — which the brief's "no accounts, payments... required" explicitly
  allows.
- **Video walkthrough:** `docs/demo-video.mp4` (1m31s, narrated) — real browser session
  across all 4 test-set scenarios, with spoken narration synthesized via the **Gemini API's
  own TTS model** (`gemini-2.5-flash-preview-tts`, voice "Kore", same `GEMINI_API_KEY`) —
  not a human voiceover. See README → "Video walkthrough" for exactly how it was built and
  reproduced.
- **This document:** `DELIVERY_NOTES.md`. Full technical report: `docs/final-report.md`.

## Sample inputs, expected/actual results

Full detail with per-field comparisons: **`docs/test-report.md`**. Summary:

| # | Scenario | Category | Expected (written before testing) | Actual | Result |
|---|---|---|---|---|---|
| 1 | `normal` | normal input | 4 changes: qty, price, removal, date | Same 4, exact match | PASS |
| 2 | `ambiguity-reorder-badtotal` | correction/ambiguity | Rename+reorder matched, qty change attributed correctly, +27.50 discrepancy flagged | Exact match (similarity 0.75, discrepancy -27.5) | PASS |
| 3 | `decline-currency-mismatch` | clarification/decline | Decline due to USD/EUR mismatch | Declined with that exact reason | PASS |
| 4 | `formatting-only` | required by brief | 0 substantive changes | 0 changes | PASS |

All 4 test PDFs and their `ground-truth.json`/`expected.md` are in the repo under
`test-set/input/` — shareable, fictional data.

## What failed

Nothing in the final delivered logic failed its test. Real failures encountered and how they
were handled (not hidden — see `docs/cost.md` and `docs/final-report.md` for full detail):

1. **Google AI Studio free-tier rate limits, hit for real:** 5 requests/minute/model and
   (later) **20 requests/day/model** — both confirmed directly from the API's own `429`
   error text, not estimated. Screenshot of the daily-quota error as it appeared in the
   running app: `docs/screenshots/05-real-daily-quota-exhausted.png`. Consequence: one
   screenshot (`03-decline-currency-mismatch-mock.png`) had to be captured with the
   deterministic mock parser instead of live Gemini, because the day's real-call budget was
   exhausted by that point — clearly labeled as such, and the underlying decline logic was
   already verified with real Gemini output earlier the same session (see `docs/test-report.md`).
2. **A genuine transient `503` from Gemini itself** ("model currently experiencing high
   demand") on two calls while capturing evidence. Response: added real retry-with-backoff
   logic (`src/ai/geminiProvider.ts`, 3 attempts, exponential backoff on 429/503) — built
   because this was actually observed, not speculatively.
3. **Two 429/503 failures were retried successfully** and ultimately produced correct
   output; none were hidden or omitted from this report.
4. **The TTS model has its own, separate, tighter rate limit:** `gemini-2.5-flash-preview-tts`
   returned `429` at **3 requests/minute/model** while generating the video's narration
   (again confirmed from the API's own error, not estimated) — resolved by waiting for the
   per-minute window and re-running the (idempotent, resumable) generation script.

## Time spent

- **Implementation (commits to the repo):** first commit `2026-09-10 09:00:48 UTC`, most
  recent measurement/documentation commit `09:57:05 UTC`, plus further work (screenshots,
  video, retry logic, this document) continuing to `~10:15 UTC` the same day — **roughly
  1h15m of active implementation**, measured from git commit timestamps, not estimated.
- **Requirements clarification (before any code):** additional real time was spent earlier
  in the same session establishing what the actual brief was (the initial materials
  provided described only evaluation criteria, not the product itself, per this project's
  own `CLAUDE.md`/no-hallucination rule) — not separately logged by commit, so not included
  in the figure above, but real. The 8-hour budget in the brief was not approached.

## Exact AI tools and models used

- **Claude (model `claude-sonnet-5`, via Claude Code)** — used throughout this session to
  design, write, test, and document the entire project (this is the AI-assisted development
  tool, distinct from what the shipped product uses at runtime).
- **Google Gemini (`gemini-2.5-flash`, via the Gemini API / Google AI Studio free tier)** —
  the AI model integrated **into the shipped product** for the PDF-structuring step
  (`src/ai/geminiProvider.ts`). This is what the real measurements in `docs/cost.md` and
  `docs/measurements.md` are based on.
- **Anthropic Claude (`claude-sonnet-5`, via the Anthropic API)** — implemented as an
  alternative structuring provider behind the same interface (`src/ai/claudeProvider.ts`),
  but not exercised with real API traffic (no funded key) — see Known limitations.
- **Google Gemini TTS (`gemini-2.5-flash-preview-tts`, voice "Kore")** — generated the real
  spoken narration for `docs/demo-video.mp4` from a fixed script (`scripts/narration.ts`),
  using the same `GEMINI_API_KEY`. Not a human recording.

## One example of how AI output was checked

Gemini's real structured extraction for the `normal` scenario was compared field-by-field
against that fixture's `ground-truth.json` — the exact values used to render the PDF,
recorded before the PDF file even existed. Result: description, quantities, unit price,
printed grand total, and printed delivery date all matched exactly; no discrepancy found.
Full comparison table: `docs/test-report.md` → "AI output check". This was chosen over
trusting the model's own claims because an LLM's self-reported confidence is not evidence —
comparing its output against an independently known-correct source is.

## Measured speed

Full detail: `docs/measurements.md`. Summary:
- Deterministic pipeline (extraction + matching + diff): **avg 10.64 ms** (10 runs, mock
  structuring step to isolate this part).
- Real AI structuring step (Gemini): **avg 7461.6 ms per comparison** (n=4 real API calls),
  range 4992.8-9415.5 ms.
- **Time to a useful result, end-to-end, warm process: roughly 5-9.4 seconds per
  comparison** in this sample (dominated by the AI call).

## Estimated variable cost per operation

Full detail, with pricing assumptions and hosting costs kept in **separate sections**:
**`docs/cost.md`**. Summary:
- **Recognition:** not applicable — inputs are text-based PDFs, no OCR/speech recognition
  used (out of scope per the brief).
- **Reasoning (the AI structuring call):** real measured tokens, 573-604 input / 1504-1648
  output per comparison. Using the (unverified, third-party) Gemini Flash price of
  $0.30/$2.50 per million input/output tokens: **avg $0.004184 per document pair**
  (real tokens x assumed price — see `docs/cost.md` for why the exact price itself
  couldn't be confirmed from Google's own site in this environment).
- **Speech:** not part of the *product's* per-operation cost — the shipped tool does not use
  speech at runtime. It was used once, separately, to produce `docs/demo-video.mp4`'s
  narration (7 real `gemini-2.5-flash-preview-tts` calls, ~86s of synthesized audio). Exact
  per-call token/character usage for those TTS calls was not captured in this delivery (the
  generation script logs audio byte size and duration, not billing units) — noted here
  rather than omitted, per "don't hide it, mark what wasn't measured."
- **Retries:** observed retries consumed 0 additional tokens (rejected before generation);
  they added latency only, not cost, in the cases actually seen.
- **Paid intermediaries:** none.
- **Hosting (separate, per the brief):** **$0 so far** — not deployed publicly; see
  `docs/cost.md` §3.2 and `README.md` → "Demo" for why, and what it would take to deploy.
- **Free credits are not zero cost, as documented:** Google AI Studio's free tier has real
  non-monetary costs recorded in `docs/cost.md` §3.1 — rate/day limits that materially
  constrain reproduction, and third-party-reported terms allowing free-tier prompts to be
  used for model training.

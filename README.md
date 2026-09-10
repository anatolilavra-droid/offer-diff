# offer-diff

Compares an original and a revised commercial offer (PDF) and reports substantive changes:
scope, quantities, unit prices, totals, and delivery dates — each with a reference back to
both source documents. Built for a supplied technical test assignment (see `TASK.md`).

**Links:** Repository — https://github.com/anatolilavra-droid/offer-diff · Live demo — see
"Demo" below (runs locally; no public URL deployed, see rationale) · Video walkthrough —
`docs/demo-video.webm` (see "Video walkthrough" below) · Delivery notes — **`DELIVERY_NOTES.md`**.

Full evaluation report (evidence, measurements, cost, tradeoffs, limitations): **`docs/final-report.md`**.

## Screenshots

All screenshots below were captured from the actual running app in a real browser
(`scripts/captureScreenshots.ts`, Playwright/Chromium) — not mockups. Unless noted, results
came from the real Gemini API (`gemini-2.5-flash`).

| | |
|---|---|
| **Upload form** | ![empty form](docs/screenshots/00-empty-form.png) |
| **Normal changes** (qty/price/removal/date, real Gemini) | ![normal](docs/screenshots/01-normal.png) |
| **Rename + reorder + wrong total** (real Gemini — uncertain match + arithmetic discrepancy) | ![ambiguity](docs/screenshots/02-ambiguity-reorder-badtotal.png) |
| **Currency mismatch → decline** (mock parser — real key hit its daily quota while capturing this one; the decline logic itself was already verified with real Gemini output earlier, see `docs/test-report.md`) | ![decline](docs/screenshots/03-decline-currency-mismatch-mock.png) |
| **Formatting-only → 0 changes** (real Gemini) | ![formatting-only](docs/screenshots/04-formatting-only.png) |
| **A real failure encountered live**: Google AI Studio's free-tier daily quota (20 requests/day/model) exhausted mid-session — the raw upstream error is surfaced to the user rather than hidden or crashing | ![quota exhausted](docs/screenshots/05-real-daily-quota-exhausted.png) |

## Flow diagram

```mermaid
flowchart TD
    U["Browser: user uploads<br/>original.pdf + revised.pdf"] --> A["POST /api/compare<br/>(src/server.ts)"]
    A --> B["extractText()<br/>deterministic, per-page,<br/>no OCR (pdfjs-dist)"]
    B --> C["StructuringProvider.structureOffer()<br/>Gemini (real) / Claude (real) / regex mock (fallback)"]
    C --> D["matchItems()<br/>order-independent, rename-tolerant<br/>(token-Jaccard similarity)"]
    D --> E["computeDiff()<br/>deterministic: currency check,<br/>qty/price/date diff, total recompute"]
    E -->|"currency mismatch or over limits"| F["Decline banner"]
    E -->|"otherwise"| G["Substantive changes +<br/>arithmetic discrepancies +<br/>uncertain matches"]
    G --> H["public/app.js renders report<br/>with source references"]
    F --> H
```

## Scope

- Two text-based PDFs (not scanned/handwritten), up to 3 pages each, one currency, up to 10
  line items per document.
- No OCR, no legal advice, no accounts/payments.
- Matches line items despite renaming and row reordering; separates confident matches from
  uncertain ones; recalculates totals deterministically and flags arithmetic discrepancies
  instead of silently trusting or "fixing" the printed total; ignores pure formatting
  differences (case, date format, thousands separators).
- Declines to conclude (rather than guessing) when the two documents state different
  currencies, or when either exceeds the page/line-item limits above.

## Requirements

- Node.js >= 22 (tested on v22.22.2)
- A Google AI Studio API key (free tier, no card required — https://aistudio.google.com/apikey)
  or an Anthropic API key, for the real AI structuring step (optional — see "Running without
  an API key" below)

## Setup

```bash
npm install
cp .env.example .env
# edit .env and set GEMINI_API_KEY (free tier) or ANTHROPIC_API_KEY if you have one
```

## Run

```bash
npm run dev
# open http://localhost:3000 in a browser
```

## Demo

This submission's working demo is **local**: `npm run dev` + a browser at
`http://localhost:3000`, per the brief's explicit allowance that "no accounts, payments...
required" — no public hosting has been provisioned or billed (see `docs/cost.md` §3.2 for
why: naming a hosting provider/price without actually using it would be an unverified
promise). If a publicly reachable URL is specifically required for evaluation, the app is a
single stateless Node/Express process with no database, so it is straightforward to deploy
to any standard Node host (Render, Fly.io, Railway, etc.) — say which platform and it can be
set up.

## Running without an API key

If neither `GEMINI_API_KEY` nor `ANTHROPIC_API_KEY` is set in `.env`, the app automatically
falls back to a deterministic regex-based mock parser (`src/ai/mockProvider.ts`) instead of
calling an AI provider. `GEMINI_API_KEY` is checked first (Google AI Studio has a free tier
with no upfront payment — see `docs/cost.md`); `ANTHROPIC_API_KEY` also works if set instead.
This lets the full flow (upload -> extract -> structure -> match -> diff -> report) run and
be demoed end-to-end, but the mock only understands this project's own fixed PDF table
layout — it is **not** a substitute for the AI step on arbitrary real-world offer PDFs. A
visible banner in the UI and a console warning make it clear when this fallback is active.

## Test

```bash
npm test                        # unit tests: matching + diff engine (deterministic, no AI)
npx tsx scripts/runTestSet.ts   # runs the full pipeline over the 4 required test-set scenarios
npx tsx scripts/measure.ts      # timing measurement (10 runs + 1 warm-up)
npx tsx scripts/browserCheck.ts # drives the actual browser UI end-to-end (needs the server running)
```

## Test set

`test-set/input/<scenario>/{original.pdf, revised.pdf, ground-truth.json, expected.md}` —
4 fixture pairs generated by `npx tsx scripts/generateFixtures.ts` (deterministic, from
`scripts/generateFixtures.ts`), covering the 3 required categories plus the brief's explicit
formatting-only requirement:

| Scenario | Category |
|---|---|
| `normal` | normal input |
| `ambiguity-reorder-badtotal` | correction / ambiguity |
| `decline-currency-mismatch` | should ask for clarification / decline to conclude |
| `formatting-only` | required by the brief: formatting changes only, 0 substantive changes expected |

Expected results were written (`expected.md`) at generation time, before the pipeline was
ever run against them. Actual results and pass/fail comparison: `docs/test-report.md`.

## Project layout

```
src/
  pdf/extractText.ts       deterministic per-page PDF text extraction (pdfjs-dist)
  pdf/renderOffer.ts        fixture PDF generator (used by scripts/generateFixtures.ts)
  ai/provider.ts             StructuringProvider interface
  ai/geminiProvider.ts       real implementation (Google Gemini, structured JSON output)
  ai/claudeProvider.ts       real implementation (Anthropic Claude, tool-use/JSON schema)
  ai/mockProvider.ts         regex fallback used when no API key is configured
  ai/selectProvider.ts       picks Gemini, else Claude, else mock, based on env vars
  matching/matchItems.ts     order-independent, rename-tolerant line-item matching
  diff/computeDiff.ts        deterministic diff + arithmetic recalculation
  pipeline.ts                orchestrates the above, with timing
  server.ts                  Express app + POST /api/compare
public/                      browser UI (plain HTML/CSS/JS, no framework)
scripts/                     fixture generation, test-set runner, measurement, browser check
tests/                       unit tests (matching + diff engine)
docs/                        final report, cost, measurements, test report
```

## Video walkthrough

`docs/demo-video.webm` — a short, silent screen recording (Playwright-driven, real browser,
real Gemini API) showing the actual upload → compare → report flow for two scenarios. This
is an automated functional walkthrough proving the flow works, not a narrated presentation
of the author's own reasoning/tradeoffs — see `DELIVERY_NOTES.md` for that.

## Known limitations

See `docs/final-report.md` ("Known limitations" and "Next improvements") for the full list.
Highlights: Google AI Studio's free tier caps usage at 5 requests/minute and **20
requests/day** per model (confirmed from real `429` errors during testing — see
`docs/screenshots/05-real-daily-quota-exhausted.png`); Claude is implemented behind the same
interface but has not been exercised with real traffic; the regex mock fallback only handles
this project's own fixed PDF layout.

## Reused vs. own work

- **Reused (third-party libraries):** `express`, `multer`, `pdfjs-dist`, `pdfkit`,
  `@google/genai`, `@anthropic-ai/sdk`, `dotenv`, `tsx`, `typescript`, `playwright`
  (dev-only, for the browser-check script) — all off-the-shelf, unmodified, standard usage.
- **Own work:** all files under `src/`, `scripts/`, `tests/`, `public/`, and `docs/` were
  written for this assignment; no pre-existing finished product was adapted.

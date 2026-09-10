# Performance measurement

## What is measured here, and what is not

Two separate measurements are recorded below:
1. The **deterministic part** of the pipeline (PDF text extraction + matching + diff),
   measured with `MockRegexStructuringProvider` so it can be repeated cheaply and often
   (10 runs, see immediately below).
2. The **real AI structuring step**, measured against the actual Gemini API once a
   (free-tier) `GEMINI_API_KEY` became available — see "Time to a useful result" further
   down. This is a smaller sample (n=4) because the free tier rate-limits requests.

## Performance measurement — deterministic pipeline (extraction + matching + diff)

- Environment: Linux x64, 4 CPUs (container), Node.js v22.22.2
- Runtime: Node.js
- Version: v22.22.2 (`node --version`)
- Input: `test-set/input/normal/{original,revised}.pdf` (1 page each, 6 -> 5 line items)
- Number of runs: 10
- Warm-up runs: 1 (excluded from stats; pdfjs-dist module init is the dominant one-time cost)
- Command: `npx tsx scripts/measure.ts`
- Raw results (total ms per run): 15.1, 12.4, 10.0, 16.3, 10.8, 7.6, 7.1, 7.0, 8.1, 12.2
- Average: 10.64 ms
- Minimum: 6.97 ms
- Maximum: 16.28 ms
- Failures: none (10/10 completed)
- Limitations: excludes the AI structuring step entirely (mock provider returns in <1ms by
  construction — that number is not representative of a real LLM call, which is why it is
  reported separately as `structuring ms` and must not be read as "AI latency"). Single
  sample size for cold pdfjs-dist init observed once (~4.8s) at process start, before the
  warm-up run — see "First-call cold start" below.

## First-call cold start (observed, not part of the 10-run average above)

- The very first `extractText()` call in a freshly started process took **4844.8 ms**
  (see the first end-to-end curl test in this session's transcript), versus 6-16 ms on
  subsequent calls in the same process. This is pdfjs-dist's module/WASM initialization,
  paid once per process lifetime, not per request, in a long-running server.
- Practical implication for the real deployment: the first request after a server (re)start
  will be materially slower than the steady-state numbers above. Not yet measured with
  repeated process restarts (would need N fresh-process runs to average this properly) —
  marked `Not measured yet`.

## Time to a useful result — full pipeline including the AI step (real Gemini calls)

A funded (free-tier) `GEMINI_API_KEY` became available and all 4 test-set scenarios were run
against the real `gemini-2.5-flash` model on 2026-09-10 (see `docs/test-report.md` for full
per-scenario detail). `scripts/measure.ts`'s repeated-run design (10 runs) could not be used
as-is for the AI step because Google AI Studio's free tier caps requests at **5 per
minute per model** — this is not a third-party estimate, it is the exact `quotaValue` returned
by the API's own `429 RESOURCE_EXHAUSTED` error when the 4th scenario's calls were attempted
immediately after the first three. The 4 comparisons (8 structuring calls total) were
therefore run as 3 + 1, a few seconds apart.

- Environment: same as above (Linux x64, 4 CPUs, Node.js v22.22.2)
- Model: `gemini-2.5-flash`
- Input: all 4 test-set scenarios (1 page, 5-6 line items each)
- Number of runs: 4 comparisons (8 individual `structureOffer()` calls, 2 per comparison, run
  concurrently via `Promise.all`)
- Warm-up runs: none (free-tier rate limit makes a throwaway warm-up call wasteful of quota)
- Command: `npx tsx scripts/runTestSet.ts` (first 3) + `npx tsx scripts/runOneScenario.ts normal` (4th, after the rate limit reset)
- Raw "structuring" timings (ms, wall-clock for both parallel calls in a comparison):
  9415.5 (ambiguity-reorder-badtotal), 4992.8 (decline-currency-mismatch), 8228.9
  (formatting-only), 7209.2 (normal)
- Average: 7461.6 ms
- Minimum: 4992.8 ms
- Maximum: 9415.5 ms
- Failures: 1 — the `normal` scenario failed on the first attempt (429 rate-limit) and
  succeeded on retry after the quota window reset; not hidden, reported here.
- Limitations: n=4, not 10 — free-tier rate limit makes a larger same-minute sample
  impractical without paid billing or a longer measurement window (e.g. 1 call/12s for a
  true 10-run average). The decline-currency-mismatch scenario still pays full structuring
  cost/latency even though its result doesn't need it beyond the currency field (see Known
  limitations in `docs/final-report.md` — an early-exit optimization is a reasonable next
  improvement).

**Time to a useful result, end-to-end (extraction + AI structuring + diff), single
comparison:** e.g. `normal` scenario, cold process: 8711.3 ms total (1501.1 ms extraction +
7209.2 ms structuring + 0.97 ms diff). In a warm process (server already running, pdfjs
initialized): extraction drops to the 7-16 ms range measured earlier, so warm-process time
to a useful result is dominated by the AI call, roughly **5-9.4 seconds** per comparison in
this sample.

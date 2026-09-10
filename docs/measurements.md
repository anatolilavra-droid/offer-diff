# Performance measurement

## What is measured here, and what is not

This measures the **deterministic part** of the pipeline only (PDF text extraction +
matching + diff), using `MockRegexStructuringProvider`, because no funded
`ANTHROPIC_API_KEY` is available yet (see `docs/cost.md`). It does **not** include the AI
structuring step's latency, which is required for a real "time to a useful result" figure.
That figure is marked `Not measured yet` below and must be re-run once a key is available
(re-run command: same script, after setting `ANTHROPIC_API_KEY` in `.env`).

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

## Time to a useful result — full pipeline including the AI step

**Not measured yet.** Blocked on a funded `ANTHROPIC_API_KEY` (see `docs/cost.md`). Once
available, re-run `npx tsx scripts/measure.ts` with the key set — `selectStructuringProvider()`
will automatically switch from the mock to `ClaudeStructuringProvider`, and the same script
will report real `structuring ms` timings from actual API calls, in addition to the
deterministic timings above.

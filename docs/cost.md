# Cost documentation

Per the brief's requirement, pricing assumptions, hosting costs, and measured cost are kept
in three separate sections below. Nothing here is presented as a promise — figures not yet
backed by a real, measured run are explicitly marked `Not measured yet`.

## 3.1 Pricing assumptions (AI API)

Two providers are implemented behind the same `StructuringProvider` interface
(`src/ai/selectProvider.ts` picks whichever API key is set, Gemini first). Both are
documented since either may end up being the one actually used for measurement.

### Google Gemini (planned primary path — Google AI Studio has a genuinely free tier)

- **Provider:** Google (Gemini API via Google AI Studio)
- **Model configured:** `gemini-2.5-flash` (see `.env.example` / `GEMINI_MODEL`)
- **Pricing unit:** USD per 1,000,000 tokens, separate input/output rates
- **Price used:** **not verified from the primary source** — direct fetches to
  `ai.google.dev` are blocked by this sandbox's network egress policy. Third-party
  aggregator pages (accessed via web search, **2026-09-10**, not Google itself) report
  Gemini 2.5 Flash at roughly **$0.30 / $2.50 per million tokens (input/output)**. Not
  treated as confirmed.
  **Action needed:** confirm the exact current price at `ai.google.dev/gemini-api/docs/pricing`
  once a key exists.
- **Free tier (documented, per CLAUDE.md's "free credits are not zero operating cost" rule):**
  no card required. **Two separate rate limits — both confirmed from the primary source
  (the API's own error responses), not third-party estimates:**
  - **Per-minute:** `429 RESOURCE_EXHAUSTED`, `quotaId:
    "GenerateRequestsPerMinutePerProjectPerModel-FreeTier"`, `quotaValue: "5"` — hit after 6
    real requests in quick succession on 2026-09-10.
  - **Per-day:** `429 RESOURCE_EXHAUSTED`, `quotaId:
    "GenerateRequestsPerDayPerProjectPerModel-FreeTier"`, `quotaValue: "20"` — hit later the
    same day after ~20+ cumulative real requests across testing, screenshot capture, and
    retry attempts (see `docs/screenshots/05-real-daily-quota-exhausted.png` for the actual
    error as it appeared in the running app). **This means a fresh free-tier key supports
    roughly 10 real comparisons per day** for `gemini-2.5-flash` (2 calls/comparison), not
    an unlimited amount — a material constraint for anyone reproducing this project's
    measurements on the same day.
  Both figures are lower than the ~15/minute third-party estimate quoted before a key was
  available, confirming those blogs' own caveat that limits vary by account/project.
  **Non-monetary cost:** third-party sources (unverified) report that free-tier prompts may
  be used by Google to improve their products (unlike the paid tier / Vertex AI) — for this
  project the submitted content is fictional test-fixture text, so that specific tradeoff is
  low-stakes here, but it is a real cost to record, not "free."
- **Formula:** `cost_per_call = (input_tokens / 1,000,000 × input_price) + (output_tokens / 1,000,000 × output_price)`
- **Usage assumptions:** one `structureOffer()` call per document, i.e. **2 calls per
  comparison**. Token counts read from `response.usageMetadata.{promptTokenCount,
  candidatesTokenCount}` (see `src/ai/geminiProvider.ts`) — not estimated from text length.

### Anthropic Claude (alternative — paid, still supported by the same interface)

- **Provider:** Anthropic (Claude API)
- **Model configured:** `claude-sonnet-5` (see `.env.example` / `ANTHROPIC_MODEL`)
- **Price used:** **not verified from the primary source** (`anthropic.com` /
  `docs.anthropic.com` blocked in this sandbox). Third-party sources report Sonnet-tier
  pricing historically around **$3.00 / $15.00 per million tokens (input/output)**
  (accessed 2026-09-10). Not treated as confirmed.
- **Formula:** same as above. Token counts read from the Anthropic response's `usage` field
  (see `src/ai/claudeProvider.ts`).

### Both providers

- **Retries:** `GeminiStructuringProvider` now implements automatic retry with exponential
  backoff (3s, 6s, up to 3 attempts total) on `429` and `503` responses
  (`src/ai/geminiProvider.ts`) — added after real testing hit both a per-minute rate limit
  (429) and a real transient `503 UNAVAILABLE` ("model currently experiencing high demand")
  from Gemini itself while capturing evidence screenshots. Each retried attempt's usage is
  tracked in `StructuringUsage.retries` (a rejected 429/503 attempt consumes 0 tokens — it's
  rejected before generation — so retries add latency, not direct token cost, unless a retry
  itself eventually succeeds and is billed normally). Claude has no retry logic and has not
  been called with real traffic in this project.
- **Paid intermediaries:** none used. PDF text extraction (`pdfjs-dist`) and matching/diff
  are local, deterministic code with no external paid API calls.

## 3.2 Hosting costs (separate from the above)

- **Current status: not deployed.** The demo runs locally (`npm run dev` + a browser
  pointed at `http://localhost:3000`), per the brief's allowance that no accounts, payments,
  or app-store release are required. **Hosting cost incurred so far: $0.**
- If a publicly reachable URL is later needed (e.g. for the video walkthrough), this is a
  single small Node.js/Express process with no database — it would fit a minimal free or
  low-cost tier on a generic Node hosting provider. No specific provider or price is named
  here because none has actually been provisioned or billed; naming one now would be an
  unverified promise, which the brief explicitly asks to avoid. This is listed as a next
  step in `docs/final-report.md`, not as a cost figure.

## 3.3 Free credits are not zero operating cost

No free credits have been used in this project yet (no API key configured at all, funded or
free-trial). If a free-trial credit balance is used later:
- It must be documented here: the credit amount, its expiration, what happens after it's
  exhausted (presumably billed at the same per-token rate above), and the fact that the
  tokens consumed still have a real, non-zero list price even though no cash changed hands
  during testing.
- The "Measured cost" section below must still report the token-based cost calculated from
  the formula above, not "$0" just because a free balance covered it.

## 3.4 Measured cost

A funded (free-tier) `GEMINI_API_KEY` became available on 2026-09-10 and all 4 test-set
scenarios were run against the real `gemini-2.5-flash` model (see `docs/test-report.md` for
per-scenario detail and `docs/measurements.md` for timing). Real token usage per comparison
(2 `structureOffer()` calls each, original + revised):

| Scenario | input tokens (orig+rev) | output tokens (orig+rev) | calculated cost* |
|---|---|---|---|
| normal | 297+276=573 | 814+690=1504 | $0.003932 |
| ambiguity-reorder-badtotal | 297+298=595 | 814+816=1630 | $0.004254 |
| decline-currency-mismatch | 297+297=594 | 814+814=1628 | $0.004248 |
| formatting-only | 297+307=604 | 814+834=1648 | $0.004301 |

\* `calculated cost = (input_tokens/1e6 × $0.30) + (output_tokens/1e6 × $2.50)`, using the
**unverified** third-party price from §3.1 — real token counts, assumed price. Average across
these 4 real comparisons: **$0.004184 per document pair**. This will change once the exact
price is confirmed from `ai.google.dev`'s own pricing page; the token counts themselves are
real and will not change.

```
Measurement period: 2026-09-10, single session, 2 process runs (rate-limit-separated)
Number of runs: 4 real comparisons (8 structureOffer() calls total)
Input: all 4 test-set scenarios (test-set/input/*/{original,revised}.pdf)
Usage: 573-604 input tokens and 1504-1648 output tokens per comparison (see table above);
       real values from response.usageMetadata, not estimated from text length
Provider price: $0.30 / $2.50 per million tokens (input/output) — UNVERIFIED, third-party,
                see §3.1 for why the primary source couldn't be checked directly
Formula: (input_tokens/1,000,000 × input_price) + (output_tokens/1,000,000 × output_price)
Calculated cost: $0.0039-$0.0043 per document pair (avg $0.004184), using the unverified price
Hosting cost: $0 (not deployed — see 3.2)
Other costs: none observed (0 retries; 1 rate-limit failure on first attempt at the 4th
             scenario, which cost 0 tokens since the request was rejected before generation)
Limitations: unverified per-token price (token counts are real); n=4 not a large sample;
             free-tier-only measurement — paid-tier latency/behavior not measured; the
             decline-currency-mismatch scenario still pays full structuring cost even though
             its result doesn't need the line items beyond the currency field.
```

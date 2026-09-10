# Cost documentation

Per the brief's requirement, pricing assumptions, hosting costs, and measured cost are kept
in three separate sections below. Nothing here is presented as a promise — figures not yet
backed by a real, measured run are explicitly marked `Not measured yet`.

## 3.1 Pricing assumptions (AI API)

- **Provider:** Anthropic (Claude API)
- **Model configured:** `claude-sonnet-5` (see `.env.example` / `ANTHROPIC_MODEL`)
- **Pricing unit:** USD per 1,000,000 tokens, separate input and output rates
- **Price used:** **not verified from the primary source.** Direct fetches to
  `anthropic.com` and `docs.anthropic.com` are blocked by this sandbox's network egress
  policy. A web search performed on **2026-09-10** returned third-party aggregator pages
  (not Anthropic itself) reporting Sonnet-tier API pricing historically around **$3.00 /
  $15.00 per million tokens (input/output)** — e.g. cloudzero.com/blog/claude-pricing,
  finout.io/blog/anthropic-api-pricing (accessed 2026-09-10). These are **secondary
  sources and are not treated as confirmed** for `claude-sonnet-5` specifically.
  **Action needed:** confirm the exact current price for the configured model at
  `console.anthropic.com → Settings → Billing` (or `anthropic.com/pricing`) once a key
  exists, and update this line with the confirmed number, source, and date.
- **Formula:** `cost_per_call = (input_tokens / 1,000,000 × input_price) + (output_tokens / 1,000,000 × output_price)`
- **Usage assumptions:** one `structureOffer()` call per document, i.e. **2 calls per
  comparison** (original + revised). Token counts are read directly from the Anthropic API
  response's `usage` field (see `src/ai/claudeProvider.ts`) — not estimated from text
  length — once real calls are made.
- **Retries:** not yet observed (no real API calls made). The client does not currently
  implement automatic retries; if added, each retry's tokens must be added to the formula
  above, per the brief's requirement to include retries in the cost estimate.
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

```
Measurement period: not started — no funded/available ANTHROPIC_API_KEY yet
Number of runs: 0 real AI calls (10 deterministic-only runs recorded, see docs/measurements.md)
Input: test-set/input/normal/{original,revised}.pdf
Usage: Not measured yet (mock provider reports inputTokens=0, outputTokens=0 by construction —
       this is not a real usage number, just the mock's fixed return value)
Provider price: see 3.1 above (unverified pending primary-source confirmation)
Formula: see 3.1 above
Calculated cost: Not measured yet
Hosting cost: $0 (not deployed — see 3.2)
Other costs: none observed
Limitations: the entire AI-step cost is unmeasured. Re-run scripts/measure.ts after setting
             ANTHROPIC_API_KEY in .env; selectStructuringProvider() will automatically switch
             to ClaudeStructuringProvider and report real input/output token counts per call,
             which combined with a confirmed price (3.1) gives a real calculated cost.
```

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
  third-party sources report Google AI Studio's free tier as no card required, does not
  expire, roughly 15 requests/minute and 1,500 requests/day for Flash models (limits vary
  by account/region and are not guaranteed). **Non-monetary cost:** those same sources
  report that free-tier prompts may be used by Google to improve their products (unlike the
  paid tier / Vertex AI) — for this project the submitted content is fictional test-fixture
  text, so that specific tradeoff is low-stakes here, but it is a real cost to record, not
  "free."
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

- **Retries:** not yet observed (no real API calls made with either provider). Neither
  client currently implements automatic retries; if added, each retry's tokens must be
  added to the formula above, per the brief's requirement.
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
Measurement period: not started — no GEMINI_API_KEY or ANTHROPIC_API_KEY configured yet
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
             GEMINI_API_KEY (or ANTHROPIC_API_KEY) in .env; selectStructuringProvider() will
             automatically switch to the real provider and report real input/output token
             counts per call, which combined with a confirmed price (3.1) gives a real
             calculated cost.
```

import type { StructuringProvider } from "./provider";
import { ClaudeStructuringProvider } from "./claudeProvider";
import { GeminiStructuringProvider } from "./geminiProvider";
import { MockRegexStructuringProvider } from "./mockProvider";

/**
 * IMPLEMENTATION DECISION: pick the first configured real provider
 * (Gemini, then Claude), falling back to the regex mock when neither API key
 * is set, so the rest of the app remains runnable and demoable. Gemini is
 * checked first because Google AI Studio offers a genuinely free API tier
 * (no upfront payment), which is what this project is currently funded by;
 * ANTHROPIC_API_KEY still works if set instead. Logs which one is active so
 * nobody mistakes mock output for a real AI call.
 */
export function selectStructuringProvider(): { provider: StructuringProvider; isMock: boolean } {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    console.log(`[offer-diff] using GeminiStructuringProvider (model=${model})`);
    return { provider: new GeminiStructuringProvider(geminiKey, model), isMock: false };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
    console.log(`[offer-diff] using ClaudeStructuringProvider (model=${model})`);
    return { provider: new ClaudeStructuringProvider(anthropicKey, model), isMock: false };
  }

  console.warn(
    "[offer-diff] WARNING: no GEMINI_API_KEY or ANTHROPIC_API_KEY set — using MockRegexStructuringProvider. " +
      "This only works on this project's own fixed PDF layout and is not a substitute for the AI step."
  );
  return { provider: new MockRegexStructuringProvider(), isMock: true };
}

import type { StructuringProvider } from "./provider";
import { ClaudeStructuringProvider } from "./claudeProvider";
import { MockRegexStructuringProvider } from "./mockProvider";

/**
 * IMPLEMENTATION DECISION: fall back to the regex mock when no funded
 * ANTHROPIC_API_KEY is configured, so the rest of the app remains runnable
 * and demoable. Logs a visible warning either way so nobody mistakes mock
 * output for the real AI step.
 */
export function selectStructuringProvider(): { provider: StructuringProvider; isMock: boolean } {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
    console.log(`[offer-diff] using ClaudeStructuringProvider (model=${model})`);
    return { provider: new ClaudeStructuringProvider(apiKey, model), isMock: false };
  }
  console.warn(
    "[offer-diff] WARNING: ANTHROPIC_API_KEY not set — using MockRegexStructuringProvider. " +
      "This only works on this project's own fixed PDF layout and is not a substitute for the AI step."
  );
  return { provider: new MockRegexStructuringProvider(), isMock: true };
}

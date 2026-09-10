import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { compareOffers } from "../src/pipeline";
import { selectStructuringProvider } from "../src/ai/selectProvider";

const INPUT_ROOT = path.join(__dirname, "..", "test-set", "input");
const ACTUAL_ROOT = path.join(__dirname, "..", "test-set", "actual");

async function main() {
  const { provider, isMock } = selectStructuringProvider();
  const scenarios = fs.readdirSync(INPUT_ROOT).filter((f) =>
    fs.statSync(path.join(INPUT_ROOT, f)).isDirectory()
  );

  fs.mkdirSync(ACTUAL_ROOT, { recursive: true });

  console.log(`provider: ${isMock ? "mock" : "claude"}`);
  console.log(`scenarios: ${scenarios.join(", ")}\n`);

  for (const scenario of scenarios) {
    const dir = path.join(INPUT_ROOT, scenario);
    const original = { fileName: "original.pdf", data: fs.readFileSync(path.join(dir, "original.pdf")) };
    const revised = { fileName: "revised.pdf", data: fs.readFileSync(path.join(dir, "revised.pdf")) };

    const result = await compareOffers(provider, original, revised);
    fs.writeFileSync(path.join(ACTUAL_ROOT, `${scenario}.json`), JSON.stringify(result, null, 2));

    console.log(`=== ${scenario} ===`);
    console.log(`decline: ${result.diff.decline}${result.diff.decline ? ` (${result.diff.declineReason})` : ""}`);
    console.log(`hasNoSubstantiveChanges: ${result.diff.hasNoSubstantiveChanges}`);
    console.log(`substantiveChanges: ${result.diff.substantiveChanges.length}`);
    for (const c of result.diff.substantiveChanges) {
      console.log(`  - [${c.field}] ${c.label}: ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`);
    }
    console.log(`uncertainMatches: ${result.diff.uncertainMatches.length}`);
    for (const u of result.diff.uncertainMatches) {
      console.log(`  - "${u.originalDescription}" ~ "${u.revisedDescription}" (sim=${u.similarity})`);
    }
    console.log(`arithmeticDiscrepancies: ${result.diff.arithmeticDiscrepancies.length}`);
    for (const a of result.diff.arithmeticDiscrepancies) {
      console.log(`  - ${a.document}: stated=${a.statedTotal} computed=${a.computedTotal} diff=${a.difference}`);
    }
    console.log(
      `timing: total=${result.timingMs.total.toFixed(1)}ms extraction=${result.timingMs.extraction.toFixed(1)}ms structuring=${result.timingMs.structuring.toFixed(1)}ms`
    );
    console.log(
      `usage: original=${JSON.stringify(result.usage.original)} revised=${JSON.stringify(result.usage.revised)}`
    );
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

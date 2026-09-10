import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { compareOffers } from "../src/pipeline";
import { selectStructuringProvider } from "../src/ai/selectProvider";

const SCENARIO = "normal";
const WARMUP_RUNS = 1;
const MEASURED_RUNS = 10;

async function main() {
  const { provider, isMock } = selectStructuringProvider();
  const dir = path.join(__dirname, "..", "test-set", "input", SCENARIO);
  const original = { fileName: "original.pdf", data: fs.readFileSync(path.join(dir, "original.pdf")) };
  const revised = { fileName: "revised.pdf", data: fs.readFileSync(path.join(dir, "revised.pdf")) };

  console.log(`environment: node ${process.version}, ${os.platform()} ${os.arch()}, ${os.cpus().length} CPUs`);
  console.log(`provider: ${isMock ? "mock (no funded API key)" : "claude"}`);
  console.log(`scenario: ${SCENARIO}, warm-up runs: ${WARMUP_RUNS}, measured runs: ${MEASURED_RUNS}\n`);

  for (let i = 0; i < WARMUP_RUNS; i++) {
    await compareOffers(provider, original, revised);
  }

  const totals: number[] = [];
  const extractions: number[] = [];
  const structurings: number[] = [];
  const usages: any[] = [];

  for (let i = 0; i < MEASURED_RUNS; i++) {
    const result = await compareOffers(provider, original, revised);
    totals.push(result.timingMs.total);
    extractions.push(result.timingMs.extraction);
    structurings.push(result.timingMs.structuring);
    usages.push(result.usage);
    console.log(
      `run ${i + 1}: total=${result.timingMs.total.toFixed(1)}ms extraction=${result.timingMs.extraction.toFixed(1)}ms structuring=${result.timingMs.structuring.toFixed(1)}ms`
    );
  }

  const stats = (arr: number[]) => ({
    avg: arr.reduce((a, b) => a + b, 0) / arr.length,
    min: Math.min(...arr),
    max: Math.max(...arr),
  });

  console.log("\n--- summary (measured runs only, warm-up excluded) ---");
  console.log("total ms:", stats(totals));
  console.log("extraction ms:", stats(extractions));
  console.log("structuring ms:", stats(structurings));
  console.log("usage (last run):", JSON.stringify(usages[usages.length - 1]));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

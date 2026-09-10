import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { compareOffers } from "../src/pipeline";
import { selectStructuringProvider } from "../src/ai/selectProvider";

async function main() {
  const scenario = process.argv[2] ?? "normal";
  const { provider } = selectStructuringProvider();
  const dir = path.join(__dirname, "..", "test-set", "input", scenario);
  const original = { fileName: "original.pdf", data: fs.readFileSync(path.join(dir, "original.pdf")) };
  const revised = { fileName: "revised.pdf", data: fs.readFileSync(path.join(dir, "revised.pdf")) };
  const result = await compareOffers(provider, original, revised);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

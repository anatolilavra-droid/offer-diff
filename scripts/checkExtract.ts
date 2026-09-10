import fs from "node:fs";
import path from "node:path";
import { extractText } from "../src/pdf/extractText";

async function main() {
  const target = process.argv[2] ?? "test-set/input/normal/original.pdf";
  const filePath = path.join(__dirname, "..", target);
  const data = fs.readFileSync(filePath);
  const result = await extractText(path.basename(filePath), data);
  for (const page of result.pages) {
    console.log(`--- page ${page.pageNumber} ---`);
    console.log(page.text);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { chromium } from "playwright";
import path from "node:path";

const OUT_DIR = path.join(__dirname, "..", "docs", "screenshots");
const BASE = "http://localhost:3000";

async function main() {
  const scenario = process.argv[2];
  const outName = process.argv[3];
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

  const dir = path.join(__dirname, "..", "test-set", "input", scenario);
  await page.goto(BASE);
  await page.setInputFiles("#original", path.join(dir, "original.pdf"));
  await page.setInputFiles("#revised", path.join(dir, "revised.pdf"));
  await page.click("#submit-btn");
  await page.waitForSelector(".section-title, .decline-banner, .ok-banner", { timeout: 30000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT_DIR, outName), fullPage: true });
  console.log(`captured ${outName}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const OUT_DIR = path.join(__dirname, "..", "docs", "screenshots");
const BASE = "http://localhost:3000";

// Real Gemini free tier caps requests at 5/minute/model (confirmed from the API itself,
// see docs/cost.md). Each scenario fires 2 concurrent calls, so spacing scenarios 30s apart
// keeps any rolling 60s window at <=4 calls.
const SPACING_MS = 30_000;

const SCENARIOS = [
  "normal",
  "ambiguity-reorder-badtotal",
  "decline-currency-mismatch",
  "formatting-only",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

  await page.goto(BASE);
  await page.screenshot({ path: path.join(OUT_DIR, "00-empty-form.png") });
  console.log("captured 00-empty-form.png");

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];
    const dir = path.join(__dirname, "..", "test-set", "input", scenario);
    await page.goto(BASE);
    await page.setInputFiles("#original", path.join(dir, "original.pdf"));
    await page.setInputFiles("#revised", path.join(dir, "revised.pdf"));
    await page.click("#submit-btn");
    await page.waitForSelector(".section-title, .decline-banner, .ok-banner", { timeout: 30000 });
    await page.waitForTimeout(300);
    const fileName = `0${i + 1}-${scenario}.png`;
    await page.screenshot({ path: path.join(OUT_DIR, fileName), fullPage: true });
    console.log(`captured ${fileName}`);

    if (i < SCENARIOS.length - 1) {
      console.log(`waiting ${SPACING_MS / 1000}s to respect the free-tier rate limit...`);
      await sleep(SPACING_MS);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

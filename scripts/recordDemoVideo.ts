import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const VIDEO_DIR = path.join(__dirname, "..", "docs", "_video-raw");

async function runScenario(page: import("playwright").Page, scenario: string) {
  const dir = path.join(__dirname, "..", "test-set", "input", scenario);
  await page.goto(BASE);
  await page.waitForTimeout(800);
  await page.setInputFiles("#original", path.join(dir, "original.pdf"));
  await page.waitForTimeout(400);
  await page.setInputFiles("#revised", path.join(dir, "revised.pdf"));
  await page.waitForTimeout(400);
  await page.click("#submit-btn");
  await page.waitForSelector(".section-title, .decline-banner, .ok-banner", { timeout: 30000 });
  await page.waitForTimeout(2500);
}

async function main() {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const context = await browser.newContext({
    viewport: { width: 1000, height: 750 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1000, height: 750 } },
  });
  const page = await context.newPage();

  await runScenario(page, "normal");
  await runScenario(page, "ambiguity-reorder-badtotal");
  await runScenario(page, "decline-currency-mismatch");
  await runScenario(page, "formatting-only");

  await context.close();
  await browser.close();

  const files = fs.readdirSync(VIDEO_DIR).filter((f) => f.endsWith(".webm"));
  console.log("recorded:", files);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

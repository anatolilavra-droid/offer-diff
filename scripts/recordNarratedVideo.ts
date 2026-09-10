import { chromium, Page } from "playwright";
import path from "node:path";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const VIDEO_DIR = path.join(__dirname, "..", "docs", "_video-raw-narrated");
const GAP_MS = 500;

const manifest: { key: string; durationMs: number }[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "docs", "_narration", "manifest.json"), "utf8")
);
const dur = (key: string) => manifest.find((m) => m.key === key)!.durationMs;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Runs `action`, then pads the remaining time up to `budgetMs` so this step's
 * on-screen duration is at least as long as its narration segment. */
async function paced(budgetMs: number, action: () => Promise<void>) {
  const start = Date.now();
  await action();
  const elapsed = Date.now() - start;
  const remaining = budgetMs - elapsed;
  if (remaining > 0) await sleep(remaining);
}

async function uploadAndCompare(page: Page, scenario: string) {
  const dir = path.join(__dirname, "..", "test-set", "input", scenario);
  await page.setInputFiles("#original", path.join(dir, "original.pdf"));
  await page.setInputFiles("#revised", path.join(dir, "revised.pdf"));
  await page.click("#submit-btn");
  await page.waitForSelector(".section-title, .decline-banner, .ok-banner", { timeout: 30000 });
}

async function main() {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const context = await browser.newContext({
    viewport: { width: 1000, height: 750 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1000, height: 750 } },
  });
  const page = await context.newPage();

  // 1. intro — empty form
  await page.goto(BASE);
  await paced(dur("intro") + GAP_MS, async () => {
    await sleep(600);
  });

  // 2. normal — upload + result
  await paced(dur("normal") + GAP_MS, async () => {
    await uploadAndCompare(page, "normal");
  });

  // 3. ambiguity-intro — reload, upload files but don't compare yet
  await page.goto(BASE);
  const dirAmb = path.join(__dirname, "..", "test-set", "input", "ambiguity-reorder-badtotal");
  await paced(dur("ambiguity-intro") + GAP_MS, async () => {
    await page.setInputFiles("#original", path.join(dirAmb, "original.pdf"));
    await page.setInputFiles("#revised", path.join(dirAmb, "revised.pdf"));
    await sleep(600);
  });

  // 4. ambiguity-result — click compare, show result
  await paced(dur("ambiguity-result") + GAP_MS, async () => {
    await page.click("#submit-btn");
    await page.waitForSelector(".section-title, .decline-banner, .ok-banner", { timeout: 30000 });
  });

  // 5. decline
  await page.goto(BASE);
  await paced(dur("decline") + GAP_MS, async () => {
    await uploadAndCompare(page, "decline-currency-mismatch");
  });

  // 6. formatting
  await page.goto(BASE);
  await paced(dur("formatting") + GAP_MS, async () => {
    await uploadAndCompare(page, "formatting-only");
  });

  // 7. closing — hold on the last result, plus a little tail buffer
  await paced(dur("closing") + 1500, async () => {
    await sleep(400);
  });

  await context.close();
  await browser.close();

  const files = fs.readdirSync(VIDEO_DIR).filter((f) => f.endsWith(".webm"));
  console.log("recorded:", files);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

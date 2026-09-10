import { chromium } from "playwright";
import path from "node:path";

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/");

  const originalPath = path.join(__dirname, "..", "test-set/input/normal/original.pdf");
  const revisedPath = path.join(__dirname, "..", "test-set/input/normal/revised.pdf");

  await page.setInputFiles("#original", originalPath);
  await page.setInputFiles("#revised", revisedPath);
  await page.screenshot({ path: "/tmp/offer-diff-before.png" });

  await page.click("#submit-btn");
  await page.waitForSelector(".section-title, .decline-banner, .ok-banner", { timeout: 15000 });
  await page.screenshot({ path: "/tmp/offer-diff-after.png", fullPage: true });

  const bodyText = await page.textContent("#results");
  console.log("RESULTS TEXT:\n", bodyText);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

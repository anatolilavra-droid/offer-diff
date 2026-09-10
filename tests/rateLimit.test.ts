import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAndRecordIp, checkAndRecordDailyBudget } from "../src/rateLimit";

test("per-IP limiter allows up to the configured burst, then blocks", () => {
  const ip = "1.2.3.4-test";
  const results = Array.from({ length: 5 }, () => checkAndRecordIp(ip));
  const allowed = results.filter((r) => r.allowed).length;
  const blocked = results.filter((r) => !r.allowed).length;
  assert.equal(allowed, 3, "should allow exactly 3 requests in the window");
  assert.equal(blocked, 2, "should block the 4th and 5th");
  assert.ok(results[3].retryAfterMs && results[3].retryAfterMs > 0, "blocked result should carry a retry hint");
});

test("per-IP limiter tracks distinct IPs independently", () => {
  const a = checkAndRecordIp("5.5.5.5-test");
  const b = checkAndRecordIp("6.6.6.6-test");
  assert.equal(a.allowed, true);
  assert.equal(b.allowed, true);
});

test("daily budget allows exactly the configured number of comparisons per day", () => {
  const results: boolean[] = [];
  for (let i = 0; i < 10; i++) {
    results.push(checkAndRecordDailyBudget().allowed);
  }
  const allowedCount = results.filter(Boolean).length;
  assert.equal(allowedCount, 6, "budget should allow exactly 6 before refusing");
  assert.equal(results[6], false, "7th call the same day should be refused");
});

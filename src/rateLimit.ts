/**
 * Minimal in-memory rate limiting for the public demo deployment. Not a
 * general-purpose solution (single-process, resets on restart, no shared
 * state across instances) -- deliberately simple, since its only job is to
 * stop the free-tier Gemini quota (5 req/min, 20 req/day/model -- see
 * docs/cost.md) from being exhausted by one client or a burst of traffic
 * before a real reviewer gets to try the demo.
 */

const PER_IP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const PER_IP_MAX_REQUESTS = 3;
const perIpHistory = new Map<string, number[]>();

/** True if `ip` is still within its own rate limit; records this attempt either way is
 * the caller's job (see checkAndRecordIp). */
export function checkAndRecordIp(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const history = (perIpHistory.get(ip) ?? []).filter((t) => now - t < PER_IP_WINDOW_MS);

  if (history.length >= PER_IP_MAX_REQUESTS) {
    const retryAfterMs = PER_IP_WINDOW_MS - (now - history[0]);
    perIpHistory.set(ip, history);
    return { allowed: false, retryAfterMs };
  }

  history.push(now);
  perIpHistory.set(ip, history);
  return { allowed: true };
}

// Global daily budget, deliberately well under the real 20-requests/day/model quota
// (2 API calls per comparison), so some quota is always left for the next visitor
// rather than the first burst of traffic exhausting it for everyone that day.
const DAILY_COMPARISON_BUDGET = 6;
let dayKey = "";
let dailyCount = 0;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // UTC date
}

export function checkAndRecordDailyBudget(): { allowed: boolean; remaining: number } {
  const key = todayKey();
  if (key !== dayKey) {
    dayKey = key;
    dailyCount = 0;
  }
  if (dailyCount >= DAILY_COMPARISON_BUDGET) {
    return { allowed: false, remaining: 0 };
  }
  dailyCount++;
  return { allowed: true, remaining: DAILY_COMPARISON_BUDGET - dailyCount };
}

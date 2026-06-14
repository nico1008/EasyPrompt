/* Best-effort, dependency-free rate limiter (fixed window).
 *
 * IMPORTANT — this is an IN-MEMORY, PER-INSTANCE throttle. On serverless (Vercel)
 * each request may land on a different warm instance and state is lost on cold
 * start, so this is a *coarse* speed bump against trivial automation/abuse, NOT a
 * hard cross-instance quota. It exists to blunt the cheap-to-launch abuse paths at
 * zero cost and zero new infra — most importantly `/api/entitlement` on the crypto
 * rail, which proxies every call to an upstream processor using CRYPTO_API_KEY
 * (see lib/providers/crypto.ts).
 *
 * For a durable, cross-instance quota, swap `checkRateLimit` for an Upstash
 * Ratelimit / KV token bucket behind the SAME signature — callers don't change.
 *
 * Pure + clock-injectable (`now`) so it's unit-testable without timers. */

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the window resets — use for the `Retry-After` header. 0 when ok. */
  retryAfter: number;
  /** Requests left in the current window. */
  remaining: number;
};

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

/* Keep the map from growing without bound under key churn (e.g. rotating IPs):
 * once it gets large, sweep entries whose window has already elapsed. */
const MAX_KEYS = 10_000;
function prune(now: number): void {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, w] of buckets) {
    if (now >= w.resetAt) buckets.delete(key);
  }
}

/**
 * Fixed-window limiter: allow up to `limit` hits per `windowMs` for `key`.
 * Returns `{ ok:false, retryAfter }` once the window is saturated.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)), remaining: 0 };
  }

  existing.count += 1;
  return { ok: true, retryAfter: 0, remaining: limit - existing.count };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Test-only: clear all windows so cases don't bleed into each other. */
export function __resetRateLimit(): void {
  buckets.clear();
}

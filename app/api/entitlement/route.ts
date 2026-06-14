/* POST /api/entitlement — body { code }.
 *
 * Runs the active provider's check(). On success, mints a short-lived
 * (~7-day) session token the client stores and later presents to /api/premium.
 * Stateless edge function; never cached. */

import { getProvider } from "@/lib/providers";
import type { Env } from "@/lib/providers/types";
import { signToken } from "@/lib/access/token";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const NO_STORE = { "Cache-Control": "no-store", "Content-Type": "application/json" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: NO_STORE });
}

function tooMany(retryAfter: number): Response {
  return new Response(JSON.stringify({ valid: false, reason: "rate-limited" }), {
    status: 429,
    headers: { ...NO_STORE, "Retry-After": String(retryAfter) },
  });
}

function readEnv(): Env {
  return {
    ACCESS_SIGNING_SECRET: process.env.ACCESS_SIGNING_SECRET,
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
    CRYPTO_API_URL: process.env.CRYPTO_API_URL,
    CRYPTO_API_KEY: process.env.CRYPTO_API_KEY,
  };
}

export async function POST(req: Request): Promise<Response> {
  const env = readEnv();
  if (!env.ACCESS_SIGNING_SECRET) {
    return json({ valid: false, reason: "server-misconfigured" }, 500);
  }

  // Coarse per-IP throttle before the provider check (the crypto rail proxies
  // upstream on every call). 10 redeems/minute is far above any honest use.
  const rl = checkRateLimit(`entitlement:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  let code: unknown;
  try {
    ({ code } = (await req.json()) as { code?: unknown });
  } catch {
    return json({ valid: false, reason: "malformed" }, 400);
  }
  if (typeof code !== "string" || !code.trim()) {
    return json({ valid: false, reason: "malformed" }, 400);
  }

  const now = new Date();
  const result = await getProvider(env.PAYMENT_PROVIDER).check(code.trim(), env, now);
  if (!result.valid || !result.plan) {
    return json({ valid: false, reason: result.reason ?? "invalid" }, 200);
  }

  const token = await signToken(env.ACCESS_SIGNING_SECRET, {
    plan: result.plan,
    entExp: result.exp,
    now,
  });

  return json({ valid: true, plan: result.plan, exp: result.exp, token }, 200);
}

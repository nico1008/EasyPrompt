/* POST /api/entitlement — body { code }.
 *
 * Runs the active provider's check(). On success, mints a short-lived
 * (~7-day) session token the client stores and later presents to /api/premium.
 * Stateless edge function; never cached. */

import { getProvider } from "@/lib/providers";
import type { Env } from "@/lib/providers/types";
import { signToken } from "@/lib/access/token";

const NO_STORE = { "Cache-Control": "no-store", "Content-Type": "application/json" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: NO_STORE });
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

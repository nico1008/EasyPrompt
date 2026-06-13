/* Telegram rail (default).
 *
 * The storefront lives in Telegram: the buyer pays there and is handed a
 * pre-minted access code. The site's only job is to verify that code's HMAC
 * signature offline — zero per-check cost, no network, no database. */

import { verifyCode } from "@/lib/access/code";
import type { EntitlementProvider, EntitlementResult, Env } from "./types";

export const telegramProvider: EntitlementProvider = {
  async check(code: string, env: Env, now: Date): Promise<EntitlementResult> {
    const result = await verifyCode(env.ACCESS_SIGNING_SECRET ?? "", code, now);
    return {
      valid: result.valid,
      plan: result.plan,
      exp: result.exp,
      reason: result.reason,
    };
  },
};

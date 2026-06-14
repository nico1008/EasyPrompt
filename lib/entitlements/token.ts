/* Pure helpers bridging an account entitlement to the existing premium token.
 * No server-only imports, so they're unit-testable. The minted token is byte-
 * identical to what /api/entitlement produces — the premium client and
 * /api/premium consume it unchanged. */

import { signToken } from "@/lib/access/token";
import { hmacSign, type Plan } from "@/lib/access/code";

/** Deterministic, non-reversible hash of a redeemed code (audit / future caps).
 *  Namespaced so it can never collide with a raw access-code signature. */
export function hashCode(secret: string, code: string): Promise<string> {
  return hmacSign(secret, `entitlement:${code.trim()}`);
}

/** Mint a premium session token from an entitlement. */
export function mintEntitlementToken(
  secret: string,
  ent: { plan: Plan; entExp?: string },
  now: Date
): Promise<string> {
  return signToken(secret, { plan: ent.plan, entExp: ent.entExp, now });
}

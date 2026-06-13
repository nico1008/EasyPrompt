/* Short-lived session token.
 *
 * After a code verifies, `/api/entitlement` mints a token the client stores and
 * presents on `Authorization: Bearer`. Same HMAC scheme and same secret as the
 * access code — just a different payload shape. The token caps how long a single
 * verification is trusted (~7 days) without re-running the provider check. */

import { b64urlEncode, b64urlDecodeToString, utf8Bytes, timingSafeEqual } from "./codec";
import { hmacSign, type Plan } from "./code";

export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // ~7 days

export type TokenPayload = {
  plan: Plan;
  /** ISO date — when this *token* expires. */
  exp: string;
  /** ISO date — when the underlying entitlement expires (for `pass`). */
  entExp?: string;
};

export type TokenVerifyResult = {
  valid: boolean;
  payload?: TokenPayload;
  reason?: "malformed" | "bad-signature" | "expired" | "no-secret";
};

function canonicalToken(p: TokenPayload): string {
  const ordered: Record<string, unknown> = { plan: p.plan, exp: p.exp };
  if (p.entExp !== undefined) ordered.entExp = p.entExp;
  return JSON.stringify(ordered);
}

/** Mint a token from a plan, expiring `TOKEN_TTL_MS` from `now`. */
export async function signToken(
  secret: string,
  input: { plan: Plan; entExp?: string; now: Date }
): Promise<string> {
  const payload: TokenPayload = {
    plan: input.plan,
    exp: new Date(input.now.getTime() + TOKEN_TTL_MS).toISOString(),
    ...(input.entExp ? { entExp: input.entExp } : {}),
  };
  const json = canonicalToken(payload);
  const sig = await hmacSign(secret, json);
  return `${b64urlEncode(json)}.${sig}`;
}

/** Verify a token: shape -> signature (constant-time) -> expiry. */
export async function verifyToken(
  secret: string,
  token: string,
  now: Date
): Promise<TokenVerifyResult> {
  if (!secret) return { valid: false, reason: "no-secret" };
  if (typeof token !== "string") return { valid: false, reason: "malformed" };

  const parts = token.trim().split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: "malformed" };
  }
  const [encodedPayload, providedSig] = parts;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(b64urlDecodeToString(encodedPayload));
  } catch {
    return { valid: false, reason: "malformed" };
  }
  if (
    !payload ||
    (payload.plan !== "lifetime" && payload.plan !== "pass" && payload.plan !== "subscription") ||
    typeof payload.exp !== "string"
  ) {
    return { valid: false, reason: "malformed" };
  }

  const expectedSig = await hmacSign(secret, canonicalToken(payload));
  if (!timingSafeEqual(utf8Bytes(providedSig), utf8Bytes(expectedSig))) {
    return { valid: false, reason: "bad-signature" };
  }

  const expMs = Date.parse(payload.exp);
  if (Number.isNaN(expMs)) return { valid: false, reason: "malformed" };
  if (expMs <= now.getTime()) return { valid: false, reason: "expired" };

  return { valid: true, payload };
}

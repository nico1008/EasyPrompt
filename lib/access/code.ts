/* Access-code format & verification.
 *
 *   code = base64url(payloadJSON) + "." + base64url(HMAC_SHA256(secret, payloadJSON))
 *
 * The payload *carries* the entitlement — there is no database. We verify the
 * signature with a secret that lives only in the host environment and never
 * reaches the browser. Runs server-side (API routes) and in the mint CLI; the
 * two share `hmacSign`/`signCode` so a minted code and the runtime verifier
 * stay byte-identical. */

import {
  b64urlEncode,
  b64urlDecodeToString,
  utf8Bytes,
  timingSafeEqual,
} from "./codec";

export type Plan = "lifetime" | "pass" | "subscription";

/** A code only ever encodes the offline plans. `subscription` is reserved for
 *  rails (e.g. crypto) that report status live and never mint a code. */
export type CodePayload = {
  plan: "lifetime" | "pass";
  /** Unique id (uuid) so otherwise-identical codes differ. */
  id: string;
  /** ISO date. Required for `pass`; ignored for `lifetime`. */
  exp?: string;
};

export type VerifyResult = {
  valid: boolean;
  plan?: Plan;
  exp?: string;
  reason?: "malformed" | "bad-signature" | "expired" | "missing-exp" | "no-secret";
};

/* ---- canonical JSON: stable key order so signing is deterministic ---- */
function canonicalPayload(p: CodePayload): string {
  const ordered: Record<string, unknown> = { plan: p.plan, id: p.id };
  if (p.exp !== undefined) ordered.exp = p.exp;
  return JSON.stringify(ordered);
}

/** Raw HMAC-SHA256 over `message`, base64url-encoded. Shared by codes + tokens
 *  + the mint CLI — the single signing path, so nothing drifts. */
export async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    utf8Bytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, utf8Bytes(message));
  return b64urlEncode(new Uint8Array(sig));
}

/** Sign a payload into a full access code. */
export async function signCode(secret: string, payload: CodePayload): Promise<string> {
  const json = canonicalPayload(payload);
  const sig = await hmacSign(secret, json);
  return `${b64urlEncode(json)}.${sig}`;
}

/** Verify a code: shape -> signature (constant-time) -> expiry. */
export async function verifyCode(
  secret: string,
  code: string,
  now: Date
): Promise<VerifyResult> {
  if (!secret) return { valid: false, reason: "no-secret" };
  if (typeof code !== "string") return { valid: false, reason: "malformed" };

  const parts = code.trim().split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: "malformed" };
  }
  const [encodedPayload, providedSig] = parts;

  // Decode + parse the payload.
  let payload: CodePayload;
  try {
    payload = JSON.parse(b64urlDecodeToString(encodedPayload));
  } catch {
    return { valid: false, reason: "malformed" };
  }
  if (
    !payload ||
    (payload.plan !== "lifetime" && payload.plan !== "pass") ||
    typeof payload.id !== "string"
  ) {
    return { valid: false, reason: "malformed" };
  }

  // Recompute the signature over the *canonical* payload and compare.
  const expectedSig = await hmacSign(secret, canonicalPayload(payload));
  if (!timingSafeEqual(utf8Bytes(providedSig), utf8Bytes(expectedSig))) {
    return { valid: false, reason: "bad-signature" };
  }

  // Expiry: required for `pass`, optional (and honoured if present) otherwise.
  if (payload.plan === "pass" && !payload.exp) {
    return { valid: false, reason: "missing-exp" };
  }
  if (payload.exp) {
    const expMs = Date.parse(payload.exp);
    if (Number.isNaN(expMs)) return { valid: false, reason: "malformed" };
    if (expMs <= now.getTime()) {
      return { valid: false, plan: payload.plan, exp: payload.exp, reason: "expired" };
    }
  }

  return { valid: true, plan: payload.plan, exp: payload.exp };
}

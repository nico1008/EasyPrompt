/* Crypto rail (option).
 *
 * The buyer pays in crypto through a hosted processor (Coinbase Commerce,
 * NOWPayments, Cryptomus, self-hosted BTCPay, …). Here the `code` the buyer
 * pastes is the processor's order / payment id; we ask the processor for its
 * status and MAP that status to an entitlement. We never watch chains directly
 * — no node, no indexer, no confirmation or exchange-rate handling.
 *
 * The status vocabulary below covers the common processors; unknown statuses
 * are treated as not-yet-valid rather than failing hard. */

import type { EntitlementProvider, EntitlementResult, Env, Plan } from "./types";

const PAID = new Set(["finished", "confirmed", "complete", "completed", "paid", "settled"]);
const PENDING = new Set(["waiting", "pending", "confirming", "sending", "new", "partially_paid"]);
const EXPIRED = new Set(["expired", "timeout"]);
const FAILED = new Set(["failed", "error", "cancelled", "canceled", "refunded", "voided"]);

type ProcessorResponse = {
  status?: string;
  payment_status?: string;
  /** Plan the order was for, if the processor echoes our metadata. */
  plan?: Plan;
  metadata?: { plan?: Plan };
  /** ISO expiry for a time-boxed entitlement, if any. */
  expires_at?: string;
  exp?: string;
};

function normalizeStatus(r: ProcessorResponse): string {
  return String(r.status ?? r.payment_status ?? "").toLowerCase();
}

function pickPlan(r: ProcessorResponse): Plan {
  return r.plan ?? r.metadata?.plan ?? "subscription";
}

export const cryptoProvider: EntitlementProvider = {
  async check(code: string, env: Env, _now: Date): Promise<EntitlementResult> {
    if (!env.CRYPTO_API_URL || !env.CRYPTO_API_KEY) {
      return { valid: false, reason: "not-configured" };
    }
    if (!code) return { valid: false, reason: "malformed" };

    let res: Response;
    try {
      const url = `${env.CRYPTO_API_URL.replace(/\/$/, "")}/${encodeURIComponent(code)}`;
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${env.CRYPTO_API_KEY}`, Accept: "application/json" },
        cache: "no-store",
      });
    } catch {
      return { valid: false, reason: "upstream-error" };
    }

    if (res.status === 404) return { valid: false, reason: "not-found" };
    if (!res.ok) return { valid: false, reason: "upstream-error" };

    let body: ProcessorResponse;
    try {
      body = (await res.json()) as ProcessorResponse;
    } catch {
      return { valid: false, reason: "upstream-error" };
    }

    const status = normalizeStatus(body);
    if (PAID.has(status)) {
      return { valid: true, plan: pickPlan(body), exp: body.expires_at ?? body.exp };
    }
    if (PENDING.has(status)) return { valid: false, reason: "pending" };
    if (EXPIRED.has(status)) return { valid: false, reason: "expired" };
    if (FAILED.has(status)) return { valid: false, reason: "failed" };
    return { valid: false, reason: "pending" };
  },
};

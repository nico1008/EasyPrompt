/* The one interface everything depends on. The site never references a specific
 * payment rail — only this contract. Swapping rails is an env var
 * (`PAYMENT_PROVIDER`); adding a rail is one new file under `lib/providers/`. */

import type { Plan } from "@/lib/access/code";

export type { Plan };

export interface EntitlementResult {
  valid: boolean;
  plan?: Plan;
  /** ISO date — when the entitlement expires (passes / subscriptions). */
  exp?: string;
  reason?: string;
}

/** Host-environment values a provider may read. All optional so a provider can
 *  validate (and clearly report) when its required config is missing. */
export interface Env {
  ACCESS_SIGNING_SECRET?: string;
  PAYMENT_PROVIDER?: string;
  /** Hosted crypto-processor base URL + key (crypto rail only). */
  CRYPTO_API_URL?: string;
  CRYPTO_API_KEY?: string;
}

export interface EntitlementProvider {
  /** Resolve a pasted `code` into an entitlement. `now` is injected for testability. */
  check(code: string, env: Env, now: Date): Promise<EntitlementResult>;
}

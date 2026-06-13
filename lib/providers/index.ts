/* Provider registry. `getProvider` resolves the active rail by name (from the
 * `PAYMENT_PROVIDER` env var), defaulting to telegram.
 *
 * Adding a rail: drop a new file in this folder and add one line to REGISTRY. */

import type { EntitlementProvider } from "./types";
import { telegramProvider } from "./telegram";
import { cryptoProvider } from "./crypto";

export const DEFAULT_PROVIDER = "telegram";

const REGISTRY: Record<string, EntitlementProvider> = {
  telegram: telegramProvider,
  crypto: cryptoProvider,
};

export function getProvider(name?: string): EntitlementProvider {
  return REGISTRY[(name ?? DEFAULT_PROVIDER).toLowerCase()] ?? REGISTRY[DEFAULT_PROVIDER];
}

export type { EntitlementProvider, EntitlementResult, Env, Plan } from "./types";

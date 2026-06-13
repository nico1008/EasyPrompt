/* Single, non-secret config file. Safe to import anywhere (client or server).
 *
 * Secrets — ACCESS_SIGNING_SECRET, PAYMENT_PROVIDER, CRYPTO_API_URL,
 * CRYPTO_API_KEY — live ONLY in the host environment (see .env.example), never
 * here. `paymentProvider` below is the display/default; the server resolves the
 * live rail from `process.env.PAYMENT_PROVIDER ?? config.paymentProvider`. */

export const config = {
  siteName: "EasyPrompt",

  /** Default rail shown in UI. Runtime uses the PAYMENT_PROVIDER env var. */
  paymentProvider: "telegram" as "telegram" | "crypto",

  /** Telegram storefront product link — buyer pays here, gets a code. */
  checkoutUrl: "https://t.me/easyprompt_store",

  /** Display prices only. No amounts are processed on-site. */
  pricing: {
    lifetime: "$5 once",
  },

  /** Feature flags for premium conveniences. */
  premiumFeatures: {
    proBoosters: true,
  },

  /** User accounts (Supabase). This flag only governs whether the account UI is
   *  surfaced; the Supabase clients independently require the NEXT_PUBLIC_*
   *  env vars to be present (see lib/supabase/env.ts). With the flag on but env
   *  absent, the anonymous builder still works and auth pages show a friendly
   *  "not configured yet" message instead of crashing. */
  accounts: {
    enabled: true,
  },
} as const;

export type Config = typeof config;

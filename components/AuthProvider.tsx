"use client";

/* Keeps server-rendered auth UI (nav, /my, /account) in sync after a client-side
 * auth change. When the Supabase client fires SIGNED_IN / SIGNED_OUT / etc., we
 * router.refresh() so the RSC tree re-reads the session. No-op when Supabase is
 * unconfigured. Mounted once in the root layout, renders nothing. */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { adoptAccountToken, accountTokenActive, lock } from "@/lib/premium/client";
import { getEntitlementToken } from "@/lib/entitlements/actions";

/* Keep the device's Pro session in sync with the account: when there's a session
 * mint a token from the account's entitlement so Pro follows the user across
 * devices; with no entitlement, drop an account-sourced token (a pasted-code
 * token survives). A standing code unlock with no account entitlement is left
 * untouched. */
async function syncAccountPro(): Promise<void> {
  const ent = await getEntitlementToken();
  if (ent) adoptAccountToken(ent.token, ent.plan);
  else if (accountTokenActive()) lock();
}

export function AuthProvider() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        if (accountTokenActive()) lock();
        router.refresh();
        return;
      }
      if (session) {
        // Logged in: reconcile the device's Pro session with the account.
        void syncAccountPro();
        if (event !== "INITIAL_SESSION") router.refresh();
      } else if (event === "INITIAL_SESSION" && accountTokenActive()) {
        // No session but a stale account token lingers — clear it.
        lock();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}

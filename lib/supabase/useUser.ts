"use client";

/* Reactive signed-in user (email) for client UI like the nav. Reads the session
 * client-side so the shared layout never calls cookies() — that keeps the
 * marketing + catalog pages statically rendered (the SEO engine). Mirrors the
 * PremiumProvider pattern: server/first paint is logged-out, then it hydrates.
 * Authorization is still enforced server-side; this is display only. */

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "./env";
import { createClient } from "./client";

export function useSupabaseUser(): string | null {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    // onAuthStateChange fires INITIAL_SESSION on subscribe with the current
    // session (read locally from the cookie — no network round-trip).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return email;
}

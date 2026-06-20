"use client";

/* Reactive signed-in user (email) for client UI like the nav. Reads the session
 * client-side so the shared layout never calls cookies() — that keeps the
 * marketing + catalog pages statically rendered (the SEO engine). Mirrors the
 * PremiumProvider pattern: server/first paint is logged-out, then it hydrates.
 * Authorization is still enforced server-side; this is display only. */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured } from "./env";
import { createClient } from "./client";

export function useSupabaseUser(): string | null {
  const [email, setEmail] = useState<string | null>(null);
  const pathname = usePathname();

  // Live updates for auth changes the browser client performs itself: token
  // refresh, cross-tab sign-in (storage event), and INITIAL_SESSION on subscribe.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Re-read from the cookie on mount AND on every navigation. Sign-in/out run as
  // SERVER ACTIONS that set the auth cookie out-of-band and then redirect — the
  // browser client never performed them, so onAuthStateChange stays silent and
  // the nav would otherwise update only after a manual reload. getUser() validates
  // the token against the (fresh) cookie, so this catches both login and logout.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (active) setEmail(data.user?.email ?? null);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  return email;
}

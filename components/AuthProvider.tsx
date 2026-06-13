"use client";

/* Keeps server-rendered auth UI (nav, /my, /account) in sync after a client-side
 * auth change. When the Supabase client fires SIGNED_IN / SIGNED_OUT / etc., we
 * router.refresh() so the RSC tree re-reads the session. No-op when Supabase is
 * unconfigured. Mounted once in the root layout, renders nothing. */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function AuthProvider() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED" ||
        event === "TOKEN_REFRESHED"
      ) {
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}

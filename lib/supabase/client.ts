/* Browser Supabase client (client components only).
 *
 * Reads the inlined NEXT_PUBLIC_* vars. Only call this when
 * isSupabaseConfigured() is true — AuthProvider gates on that before creating
 * a client, so the anonymous site never constructs one. */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from "./env";

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)."
    );
  }
  return createBrowserClient<Database>(supabaseUrl()!, supabaseAnonKey()!);
}

import "server-only";

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { supabaseUrl, isSupabaseConfigured } from "./env";

/** Server-only privileged client.
 *
 * Use only after the caller has passed an explicit server-side authorization
 * check. This must never be imported from middleware, client components, shared
 * UI, or any browser-bundled module.
 */
export function createServiceRoleClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Supabase service role key is not configured.");
  }

  return createSupabaseJsClient<Database>(supabaseUrl()!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

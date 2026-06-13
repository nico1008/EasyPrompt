/* Single source of truth for Supabase environment access.
 *
 * The two NEXT_PUBLIC_* vars are inlined at build time, so these helpers work
 * in both the browser and on the server. `isSupabaseConfigured()` is the gate
 * the whole account system checks first: when it returns false, the anonymous
 * builder keeps working and auth UI shows a friendly "not configured" state
 * instead of throwing. */

export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
}

export function supabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined;
}

/** True only when both public vars are present. Every account feature checks
 *  this before touching Supabase. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

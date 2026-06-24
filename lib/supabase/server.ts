import "server-only";

/* Server Supabase client for Server Components, Server Actions and Route
 * Handlers. `import "server-only"` keeps it out of the client bundle (same
 * guard the premium boosters use).
 *
 * Next 15: cookies() is async, so this factory is async too. The setAll
 * try/catch swallows the "can't set cookies from a Server Component" error —
 * that's expected; middleware.ts refreshes the session cookie on every request.
 *
 * Always authorize with getServerUser()/supabase.auth.getUser() (which
 * revalidates the JWT against Supabase), never getSession() (which trusts the
 * cookie as-is). */

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { Database } from "./types";
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from "./env";

export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)."
    );
  }
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl()!, supabaseAnonKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* Set from a Server Component — ignore; middleware handles refresh. */
        }
      },
    },
  });
}

/** A sessionless, cookie-FREE anon client for PUBLIC reads — the security-definer
 *  RPCs (community_*, public_profile*, published_*) are granted to `anon` and never
 *  depend on the caller's session. Using this instead of createClient() keeps the
 *  public detail routes free of `cookies()`, which otherwise throws
 *  DYNAMIC_SERVER_USAGE on routes that also use generateStaticParams (e.g.
 *  /prompts/[slug]) because reading a dynamic API in a statically-rendered route is
 *  disallowed. Synchronous (no cookie store to await). */
export function createPublicClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)."
    );
  }
  return createSupabaseJsClient<Database>(supabaseUrl()!, supabaseAnonKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The authenticated, JWT-revalidated user, or null. Safe to call when
 *  Supabase is unconfigured (returns null) so layouts/nav can call it freely. */
export async function getServerUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

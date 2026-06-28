/* Session-refresh + route-guard helper, called from the root middleware.ts.
 *
 * Runs on the Edge runtime (Next middleware is edge-only). `@supabase/ssr`'s
 * createServerClient works here. When Supabase is unconfigured this is a pure
 * pass-through, so the anonymous site is unaffected.
 *
 * The canonical pattern: build the response, create the client wired to read
 * request cookies and write refreshed cookies onto the response, then call
 * getUser() with NOTHING in between (getUser revalidates and triggers the
 * cookie refresh). Only after that do we apply the route guard. */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from "./env";

/** Path prefixes that require a signed-in user. */
const PROTECTED_PREFIXES = ["/my", "/account"];
const AUTH_HINT_COOKIE = "easyprompt.auth";

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Accounts dark → don't touch cookies, don't guard. Anonymous site as-is.
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(supabaseUrl()!, supabaseAnonKey()!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not insert code between client creation and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    response.cookies.set(AUTH_HINT_COOKIE, "1", {
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    response.cookies.delete(AUTH_HINT_COOKIE);
  }

  const pathname = request.nextUrl.pathname;
  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return response;
}

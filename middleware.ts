import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/* Refreshes the Supabase auth session on every (non-static, non-/api) request
 * and redirect-guards the account areas. A no-op when Supabase is unconfigured.
 *
 * We exclude /api so the existing stateless edge entitlement routes stay lean —
 * they authenticate with a bearer token, not the session cookie, and never need
 * a session refresh. */

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

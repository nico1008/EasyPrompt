/* Email-link landing route. Handles BOTH Supabase email flows:
 *   - token_hash + type  → verifyOtp  (custom email templates; the recommended
 *     SSR pattern — set the template URL to /auth/confirm?token_hash=...&type=...)
 *   - code               → exchangeCodeForSession (default templates / PKCE)
 * Either way it sets the session cookie, then redirects to a sanitized `next`.
 * Node runtime (default) so it can write cookies. */

import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeAuthRedirect } from "@/lib/auth/redirects";

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);

  const next = safeAuthRedirect(searchParams.get("next"));

  if (!isSupabaseConfigured()) return NextResponse.redirect(`${origin}/`);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=confirm`);
}

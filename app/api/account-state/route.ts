import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const NO_STORE = { "Cache-Control": "no-store", "Content-Type": "application/json" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: NO_STORE });
}

export async function GET(): Promise<Response> {
  if (!isSupabaseConfigured()) return json({ configured: false, user: null });

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return json({ configured: true, user: null });

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, is_public")
      .eq("id", user.id)
      .maybeSingle();

    return json({
      configured: true,
      user: {
        email: user.email ?? "",
        profile: {
          username: profile?.username ?? null,
          displayName: profile?.display_name ?? null,
          isPublic: profile?.is_public ?? false,
        },
      },
    });
  } catch {
    return json({ configured: true, user: null });
  }
}

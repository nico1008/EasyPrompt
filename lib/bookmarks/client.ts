"use client";

/* Client-side bookmark read for BookmarkButton on the statically-generated
 * catalog, so the initial on/off state shows without making those pages dynamic
 * (same client-hydrate pattern as the ratings client). Read only — the toggle
 * stays in the Zod-validated server action. Callers invoke this only when a user
 * is signed in. */

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { BookmarkTarget } from "./schema";

export async function fetchIsBookmarked(target: BookmarkTarget): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("target_kind", target.kind)
      .eq("target_key", target.key)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

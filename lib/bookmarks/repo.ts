import "server-only";

/* Read helpers for bookmarks, callable from Server Components. RLS scopes every
 * query to the signed-in owner — no explicit owner filters. */

import { createClient } from "@/lib/supabase/server";
import type { BookmarkRow } from "./map";
import type { BookmarkTarget } from "./schema";

export async function listBookmarks(): Promise<BookmarkRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookmarks")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function isBookmarked(target: BookmarkTarget): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("target_kind", target.kind)
    .eq("target_key", target.key)
    .maybeSingle();
  return Boolean(data);
}

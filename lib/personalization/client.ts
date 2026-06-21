"use client";

/* Reads the signed-in user's OWN library (bookmarks + saved prompts + templates)
 * via the browser client (RLS scopes to the owner), maps each to a catalog category,
 * and returns a category→affinity map for the "For you" sort. Empty for logged-out
 * users / when Supabase is off, so the catalog is unchanged for them. Fails soft. */

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getTemplate } from "@/data/templates";
import { computeAffinity } from "./affinity";

export async function fetchCategoryAffinity(): Promise<Map<string, number>> {
  if (!isSupabaseConfigured()) return new Map();
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Map();

    const [bm, sp, ut] = await Promise.all([
      supabase.from("bookmarks").select("target_kind, target_key"),
      supabase.from("saved_prompts").select("source_kind, catalog_slug"),
      supabase.from("user_templates").select("category"),
    ]);

    const bookmarkCategories = (bm.data ?? [])
      .filter((b) => b.target_kind === "catalog")
      .map((b) => getTemplate(b.target_key)?.category)
      .filter((c): c is string => Boolean(c));
    const savedCategories = (sp.data ?? [])
      .filter((p) => p.source_kind === "catalog" && p.catalog_slug)
      .map((p) => getTemplate(p.catalog_slug as string)?.category)
      .filter((c): c is string => Boolean(c));
    const templateCategories = (ut.data ?? [])
      .map((t) => t.category)
      .filter((c): c is string => Boolean(c));

    return computeAffinity({ bookmarkCategories, savedCategories, templateCategories });
  } catch {
    return new Map();
  }
}

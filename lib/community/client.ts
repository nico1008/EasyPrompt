"use client";

/* Client-side listing of public community content for the SSG /prompts
 * and /templates pages — the pages stay static and this hydrates the "From the
 * community" section client-side (same pattern as lib/metrics/client.ts). Anon-safe
 * via the security-definer listing RPCs; fails soft to []. */

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { promptRowToCard, templateRowToCard, type CommunityCard } from "./map";

export async function fetchCommunityPrompts(limit = 24, offset = 0): Promise<CommunityCard[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("published_prompts", {
      p_limit: limit,
      p_offset: offset,
    });
    if (error || !data) return [];
    return data.map(promptRowToCard);
  } catch {
    return [];
  }
}

export async function fetchCommunityTemplates(
  limit = 24,
  offset = 0,
  category: string | null = null
): Promise<CommunityCard[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("published_templates", {
      p_limit: limit,
      p_offset: offset,
      p_category: category,
    });
    if (error || !data) return [];
    return data.map(templateRowToCard);
  } catch {
    return [];
  }
}

/* Lazily fetch a community Prompt's full body for Copy/Open — the listing only
 * ships a short preview, so the grid resolves the body on first use (cached by the
 * caller). Uses the same security-definer community_prompt(slug) RPC as the detail
 * route. Returns "" on any miss so the caller fails soft. */
export async function fetchCommunityPromptBody(slug: string): Promise<string> {
  if (!isSupabaseConfigured()) return "";
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("community_prompt", { p_slug: slug });
    if (error || !data || data.length === 0) return "";
    return data[0].body ?? "";
  } catch {
    return "";
  }
}

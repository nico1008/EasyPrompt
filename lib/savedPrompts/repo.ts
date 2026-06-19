import "server-only";

/* Read helpers for saved prompts. RLS scopes every query to the owner. */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { buildPrompt, type Answers } from "@/lib/buildPrompt";
import { getTemplate } from "@/data/templates";

export type SavedPromptRow = Database["public"]["Tables"]["saved_prompts"]["Row"];

export async function listSavedPrompts(): Promise<SavedPromptRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_prompts")
    .select("*")
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getSavedPrompt(id: string): Promise<SavedPromptRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_prompts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/* Public read for a published/unlisted Prompt via the security-definer
 * shared_prompt(slug) RPC (exact-slug, visibility-gated, no enumeration). Renders
 * from the frozen `body` when present (set at publish time); otherwise recomputes
 * a catalog-sourced prompt from its answers. Anon-safe. */
export async function getSharedPrompt(
  slug: string
): Promise<{ name: string; text: string; sourceSlug: string | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("shared_prompt", { p_slug: slug });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  if (row.body && row.body.trim()) {
    return { name: row.name, text: row.body, sourceSlug: row.catalog_slug };
  }
  if (row.source_kind === "catalog" && row.catalog_slug) {
    const t = getTemplate(row.catalog_slug);
    if (t) {
      const answers = (row.answers as unknown as Answers | null) ?? { fields: {}, checks: {} };
      return { name: row.name, text: buildPrompt(t, answers).text, sourceSlug: row.catalog_slug };
    }
  }
  return { name: row.name, text: row.body ?? "", sourceSlug: row.catalog_slug };
}

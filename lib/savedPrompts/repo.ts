import "server-only";

/* Read helpers for saved prompts. RLS scopes every query to the owner. */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

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

import "server-only";

/* Read helpers for notebooks, callable from Server Components. RLS scopes every
 * query to the signed-in owner (auth.uid() = owner_id), so there are no explicit
 * owner filters here — the database enforces ownership. Mirrors
 * lib/userTemplates/repo.ts. */

import { createClient } from "@/lib/supabase/server";
import type { NotebookRow } from "./map";

export async function listNotebooks(): Promise<NotebookRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prompt_notebooks")
    .select("*")
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getNotebook(id: string): Promise<NotebookRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prompt_notebooks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

import "server-only";

/* Read helpers for notebooks, callable from Server Components. RLS scopes every
 * query to the signed-in owner (auth.uid() = owner_id), so there are no explicit
 * owner filters here — the database enforces ownership. Mirrors
 * lib/userTemplates/repo.ts. */

import { createClient } from "@/lib/supabase/server";
import { validateBlockDoc } from "@/lib/blocks/schema";
import type { BlockDoc } from "@/lib/blocks/types";
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

/* Public read for a public Template. Goes through the security-definer RPC
 * (shared_notebook), which returns name+doc for an EXACT slug only — no table
 * read, no enumeration, no owner exposure. Anon-safe (no session required). */
export async function getSharedNotebook(
  slug: string
): Promise<{ name: string; doc: BlockDoc } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("shared_notebook", { p_slug: slug });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  const parsed = validateBlockDoc(row.doc);
  if (!parsed.ok) return null;
  return { name: row.name, doc: parsed.value };
}

import "server-only";

/* Read helpers for user templates, callable from Server Components. RLS scopes
 * every query to the signed-in owner (auth.uid() = owner_id), so there are no
 * explicit owner filters here — the database enforces ownership. */

import { createClient } from "@/lib/supabase/server";
import type { UserTemplateRow } from "./map";

export async function listUserTemplates(): Promise<UserTemplateRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_templates")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getUserTemplate(id: string): Promise<UserTemplateRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_templates")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return data ?? null;
}

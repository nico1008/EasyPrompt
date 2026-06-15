"use server";

/* Mutations for notebooks (block-based builder docs). Every write re-checks
 * getUser() and relies on RLS (owner_id = auth.uid()). create/update return
 * state for inline UI in the NotebookBuilder; delete/duplicate are form actions
 * that redirect. Mirrors lib/savedPrompts/actions.ts. The builder serializes the
 * whole BlockDoc to a JSON `doc` field. */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { nameSchema } from "@/lib/savedPrompts/schema";
import { parseBlockDoc } from "@/lib/blocks/schema";
import type { BlockDoc } from "@/lib/blocks/types";

export type NotebookSaveState = { ok?: boolean; error?: string; savedId?: string };

/* --------------------------------- create --------------------------------- */
export async function createNotebookAction(
  _prev: NotebookSaveState,
  formData: FormData
): Promise<NotebookSaveState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to save." };

  const name = (formData.get("name") as string | null)?.trim() || "Untitled notebook";
  const nameCheck = nameSchema.safeParse(name);
  if (!nameCheck.success) return { error: nameCheck.error.issues[0].message };

  const doc = parseBlockDoc(formData.get("doc"));
  if (!doc.ok) return { error: doc.error };

  const { data, error } = await supabase
    .from("prompt_notebooks")
    .insert({ owner_id: user.id, name: nameCheck.data, doc: doc.value })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't save. Please try again." };

  revalidatePath("/my/notebooks");
  return { ok: true, savedId: data.id };
}

/* ----------------------------- update (re-save) --------------------------- */
export async function updateNotebookAction(
  _prev: NotebookSaveState,
  formData: FormData
): Promise<NotebookSaveState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to save." };

  const doc = parseBlockDoc(formData.get("doc"));
  if (!doc.ok) return { error: doc.error };

  const patch: { doc: BlockDoc; name?: string } = { doc: doc.value };
  const name = (formData.get("name") as string | null)?.trim();
  if (name) {
    const nameCheck = nameSchema.safeParse(name);
    if (!nameCheck.success) return { error: nameCheck.error.issues[0].message };
    patch.name = nameCheck.data;
  }

  const { error } = await supabase.from("prompt_notebooks").update(patch).eq("id", id);
  if (error) return { error: "Couldn't save your changes." };

  revalidatePath("/my/notebooks");
  revalidatePath(`/my/notebooks/${id}`);
  return { ok: true, savedId: id };
}

/* --------------------------------- delete --------------------------------- */
export async function deleteNotebookAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/my/notebooks");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/my/notebooks");

  const supabase = await createClient();
  await supabase.from("prompt_notebooks").delete().eq("id", id);
  revalidatePath("/my/notebooks");
  redirect("/my/notebooks");
}

/* ------------------------------- duplicate -------------------------------- */
export async function duplicateNotebookAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/my/notebooks");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/my/notebooks");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: src } = await supabase
    .from("prompt_notebooks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!src) redirect("/my/notebooks");

  await supabase.from("prompt_notebooks").insert({
    owner_id: user.id,
    name: `${src.name} (copy)`,
    doc: src.doc,
  });
  revalidatePath("/my/notebooks");
  redirect("/my/notebooks");
}

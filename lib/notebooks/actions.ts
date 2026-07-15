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
import { blockDocSaveError, parseBlockDoc } from "@/lib/blocks/schema";
import type { BlockDoc } from "@/lib/blocks/types";
import { recordVersion } from "./versions/repo";
import { makeShareSlug } from "./share";

export type NotebookSaveState = { ok?: boolean; error?: string; savedId?: string };
export type ShareState = {
  ok?: boolean;
  error?: string;
  shareSlug?: string | null;
  visibility?: "private" | "public";
};

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

  const name = (formData.get("name") as string | null)?.trim() || "Untitled prompt";
  const nameCheck = nameSchema.safeParse(name);
  if (!nameCheck.success) return { error: nameCheck.error.issues[0].message };

  const doc = parseBlockDoc(formData.get("doc"));
  if (!doc.ok) return { error: doc.error };
  const saveError = blockDocSaveError(doc.value);
  if (saveError) return { error: saveError };

  const { data, error } = await supabase
    .from("prompt_notebooks")
    .insert({ owner_id: user.id, name: nameCheck.data, doc: doc.value })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't save. Please try again." };

  revalidatePath("/my");
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
  const saveError = blockDocSaveError(doc.value);
  if (saveError) return { error: saveError };

  const patch: { doc: BlockDoc; name?: string } = { doc: doc.value };
  const name = (formData.get("name") as string | null)?.trim();
  if (name) {
    const nameCheck = nameSchema.safeParse(name);
    if (!nameCheck.success) return { error: nameCheck.error.issues[0].message };
    patch.name = nameCheck.data;
  }

  // Snapshot the pre-save state for version history (best-effort).
  const { data: prev } = await supabase
    .from("prompt_notebooks")
    .select("name, doc")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("prompt_notebooks").update(patch).eq("id", id);
  if (error) return { error: "Couldn't save your changes." };

  if (prev) {
    await recordVersion(supabase, {
      notebookId: id,
      ownerId: user.id,
      name: prev.name,
      doc: prev.doc,
    });
  }

  revalidatePath("/my");
  revalidatePath(`/my/notebooks/${id}`);
  return { ok: true, savedId: id };
}

/* ------------------------------- sharing ---------------------------------- */
/** Turn public sharing on or off through the checked publishing RPC. */
export async function setNotebookShareAction(
  _prev: ShareState,
  formData: FormData
): Promise<ShareState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };
  const on = formData.get("on") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  let shareSlug: string | null = null;
  if (on) {
    const { data: notebook } = await supabase
      .from("prompt_notebooks")
      .select("doc")
      .eq("id", id)
      .maybeSingle();
    const parsedDoc = notebook ? parseBlockDoc(JSON.stringify(notebook.doc)) : null;
    if (!parsedDoc?.ok) return { error: "This Template is not available." };
    const saveError = blockDocSaveError(parsedDoc.value);
    if (saveError) return { error: saveError.replace("saving", "sharing") };

    // Keep an existing slug stable so a shared link doesn't churn on re-toggle.
    const { data: existing } = await supabase
      .from("prompt_notebooks")
      .select("share_slug")
      .eq("id", id)
      .maybeSingle();
    shareSlug = existing?.share_slug ?? makeShareSlug();
  }

  const visibility = on ? "public" : "private";
  const { data, error } = await supabase.rpc("set_content_visibility", {
    p_target_kind: "notebook",
    p_target_id: id,
    p_visibility: visibility,
    p_share_slug: shareSlug,
  });
  if (error) return { error: "Couldn't update sharing." };

  revalidatePath("/my");
  revalidatePath(`/my/notebooks/${id}`);
  return { ok: true, shareSlug: on ? data : null, visibility };
}

/* --------------------------------- delete --------------------------------- */
export async function deleteNotebookAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/my");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/my");

  const supabase = await createClient();
  await supabase.from("prompt_notebooks").delete().eq("id", id);
  revalidatePath("/my");
}

/* ------------------------------- duplicate -------------------------------- */
export async function duplicateNotebookAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/my");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/my");

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
  if (!src) redirect("/my");

  await supabase.from("prompt_notebooks").insert({
    owner_id: user.id,
    name: `${src.name} (copy)`,
    doc: src.doc,
  });
  revalidatePath("/my");
}

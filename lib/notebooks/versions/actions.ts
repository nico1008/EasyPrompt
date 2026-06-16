"use server";

/* Version-history mutations for the prompt builder. Every write re-checks
 * getUser() and relies on RLS (owner_id = auth.uid()). Snapshots store a
 * point-in-time copy of a notebook's doc; restore loads one back and returns it
 * so the client editor can adopt it immediately. Mirrors the action skeleton in
 * lib/notebooks/actions.ts. */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { nameSchema } from "@/lib/savedPrompts/schema";
import { parseBlockDoc, validateBlockDoc } from "@/lib/blocks/schema";
import type { BlockDoc } from "@/lib/blocks/types";
import {
  listVersions,
  getVersionDoc,
  recordVersion,
  type NotebookVersion,
} from "./repo";

export type VersionSaveState = { ok?: boolean; error?: string };
export type RestoreState = { ok?: boolean; error?: string; doc?: BlockDoc };

/** List a notebook's snapshots (newest first). Owner-only via RLS. */
export async function listVersionsAction(notebookId: string): Promise<NotebookVersion[]> {
  if (!isSupabaseConfigured() || !notebookId) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return listVersions(notebookId);
}

/** Manually snapshot the current editor doc as a new version. */
export async function snapshotNotebookAction(
  _prev: VersionSaveState,
  formData: FormData
): Promise<VersionSaveState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const doc = parseBlockDoc(formData.get("doc"));
  if (!doc.ok) return { error: doc.error };

  const name = (formData.get("name") as string | null)?.trim() || "Untitled prompt";
  const nameCheck = nameSchema.safeParse(name);
  if (!nameCheck.success) return { error: nameCheck.error.issues[0].message };

  await recordVersion(supabase, {
    notebookId: id,
    ownerId: user.id,
    name: nameCheck.data,
    doc: doc.value,
  });

  revalidatePath(`/my/notebooks/${id}`);
  return { ok: true };
}

/** Restore a version: snapshot the current state, then load the version's doc. */
export async function restoreVersionAction(
  _prev: RestoreState,
  formData: FormData
): Promise<RestoreState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };

  const notebookId = formData.get("notebookId");
  const versionId = formData.get("versionId");
  if (typeof notebookId !== "string" || !notebookId) return { error: "Missing id." };
  if (typeof versionId !== "string" || !versionId) return { error: "Missing version." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const raw = await getVersionDoc(versionId);
  if (raw == null) return { error: "That version is no longer available." };
  const restored = validateBlockDoc(raw);
  if (!restored.ok) return { error: "That version looks corrupted." };

  // Snapshot the pre-restore state so restoring is itself reversible.
  const { data: current } = await supabase
    .from("prompt_notebooks")
    .select("name, doc")
    .eq("id", notebookId)
    .maybeSingle();
  if (current) {
    await recordVersion(supabase, {
      notebookId,
      ownerId: user.id,
      name: current.name,
      doc: current.doc,
    });
  }

  const { error } = await supabase
    .from("prompt_notebooks")
    .update({ doc: restored.value })
    .eq("id", notebookId);
  if (error) return { error: "Couldn't restore that version." };

  revalidatePath(`/my/notebooks/${notebookId}`);
  return { ok: true, doc: restored.value };
}

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
import { documentFromBlockDoc } from "@/lib/templates/adapters";
import { userTemplateDefinition } from "@/lib/templates/adapters";
import { templateReadiness } from "@/lib/templates/compiler";
import { buildPromptFromBlocks } from "@/lib/buildPrompt";
import { recordVersion } from "./versions/repo";
import { makeShareSlug } from "./share";
import { CATEGORIES } from "@/data/templates";
import { ICON_NAMES, type IconName } from "@/components/iconNames";

export type NotebookSaveState = { ok?: boolean; error?: string; savedId?: string; editVersion?: number };
export type ShareState = {
  ok?: boolean;
  error?: string;
  shareSlug?: string | null;
  visibility?: "private" | "public";
};

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "template";
}

function metadataFromForm(formData: FormData, fallback?: { blurb: string | null; category: string; icon: string }) {
  const outcome = String(formData.get("outcome") ?? fallback?.blurb ?? "").trim();
  const requestedCategory = String(formData.get("category") ?? fallback?.category ?? "work");
  const category = CATEGORIES.some((item) => item.id === requestedCategory) ? requestedCategory : "work";
  const requestedIcon = String(formData.get("icon") ?? fallback?.icon ?? "briefcase");
  const icon = (ICON_NAMES as readonly string[]).includes(requestedIcon) ? requestedIcon as IconName : "briefcase";
  return { outcome: outcome.slice(0, 240), category, icon };
}

function legacyColumns(doc: BlockDoc) {
  const blank: BlockDoc = {
    ...doc,
    blocks: doc.blocks.map((block) => {
      if (block.kind === "variable") return { ...block, value: "" };
      if (block.kind === "optional_toggle") return { ...block, suggestedSelected: false };
      return block;
    }),
  };
  return {
    base_prompt: buildPromptFromBlocks(blank).text,
    fields: doc.blocks.flatMap((block) => block.kind === "variable"
      ? [{ ...block.field, default: block.value || block.field.default }]
      : []),
    checkboxes: doc.blocks.flatMap((block) => block.kind === "optional_toggle"
      ? [{ id: block.id, label: block.label, sub: block.helper, injected_text: block.injectedText, default: block.suggestedSelected }]
      : []),
  };
}

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
  const canonical = documentFromBlockDoc(doc.value);
  const metadata = metadataFromForm(formData);
  const { data, error } = await supabase
    .from("user_templates")
    .insert({
      owner_id: user.id,
      slug: `${slugify(nameCheck.data)}-${Date.now().toString(36).slice(-4)}`,
      title: nameCheck.data,
      category: metadata.category,
      icon: metadata.icon,
      tag: "Template",
      blurb: metadata.outcome || "Fill the reusable inputs to generate a Prompt.",
      intro: "",
      ...legacyColumns(doc.value),
      document: canonical,
      schema_version: canonical.schema_version,
      edit_version: 1,
      visibility: "private",
      is_public: false,
    })
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
  const canonical = documentFromBlockDoc(doc.value);

  const patch: { doc: BlockDoc; name?: string } = { doc: doc.value };
  const name = (formData.get("name") as string | null)?.trim();
  if (name) {
    const nameCheck = nameSchema.safeParse(name);
    if (!nameCheck.success) return { error: nameCheck.error.issues[0].message };
    patch.name = nameCheck.data;
  }

  const { data: canonicalRow } = await supabase
    .from("user_templates")
    .select("id, edit_version, category, icon, blurb")
    .eq("id", id)
    .maybeSingle();

  if (canonicalRow) {
    const metadata = metadataFromForm(formData, canonicalRow);
    const expected = Number(formData.get("edit_version") ?? canonicalRow.edit_version);
    const { data: saved, error: canonicalError } = await supabase.rpc("save_template_edit", {
      p_template_id: id,
      p_expected_edit_version: expected,
      p_document: canonical,
      p_title: patch.name ?? doc.value.title ?? "Untitled Template",
      p_outcome: metadata.outcome,
      p_category: metadata.category,
      p_icon: metadata.icon,
    });
    if (canonicalError) {
      return { error: canonicalError.message.includes("edit conflict") ? "This Template changed in another session." : "Couldn't save your changes." };
    }
    await supabase.from("user_templates").update(legacyColumns(doc.value)).eq("id", id);
    revalidatePath("/my");
    revalidatePath(`/my/templates/${id}`);
    return { ok: true, savedId: id, editVersion: saved?.[0]?.edit_version };
  }

  // Legacy notebook writes stay available until that record is migrated.
  const saveError = blockDocSaveError(doc.value);
  if (saveError) return { error: saveError };
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

export async function overwriteTemplateAction(
  _prev: NotebookSaveState,
  formData: FormData
): Promise<NotebookSaveState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };
  const doc = parseBlockDoc(formData.get("doc"));
  if (!doc.ok) return { error: doc.error };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in again." };
  const canonical = documentFromBlockDoc(doc.value);
  const { data: current } = await supabase.from("user_templates").select("blurb, category, icon").eq("id", id).maybeSingle();
  const metadata = metadataFromForm(formData, current ?? undefined);
  const { data: editVersion, error } = await supabase.rpc("overwrite_template_edit", {
    p_template_id: id,
    p_document: canonical,
    p_title: (formData.get("name") as string | null)?.trim() || doc.value.title || "Untitled Template",
  });
  if (error) return { error: "Couldn't overwrite the server version." };
  await supabase.from("user_templates").update({ ...legacyColumns(doc.value), blurb: metadata.outcome, category: metadata.category, icon: metadata.icon }).eq("id", id);
  revalidatePath("/my");
  revalidatePath(`/my/templates/${id}`);
  return { ok: true, savedId: id, editVersion };
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

  const { data: canonicalTemplate } = await supabase
    .from("user_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (canonicalTemplate) {
    if (!on) {
      const { error } = await supabase.rpc("unpublish_template", { p_template_id: id });
      if (error) return { error: "Couldn't unpublish this Template." };
      revalidatePath("/my");
      revalidatePath(`/my/templates/${id}`);
      return { ok: true, shareSlug: null, visibility: "private" };
    }
    const issues = templateReadiness(userTemplateDefinition(canonicalTemplate));
    if (!canonicalTemplate.title.trim() || !canonicalTemplate.blurb?.trim() || !canonicalTemplate.category.trim()) {
      return { error: "Add a title, outcome description, and category before publishing." };
    }
    if (issues.length) return { error: issues[0].message };
    const stableSlug = canonicalTemplate.share_slug ?? makeShareSlug();
    const { data, error } = await supabase.rpc("publish_template_revision", {
      p_template_id: id,
      p_expected_edit_version: canonicalTemplate.edit_version,
      p_share_slug: stableSlug,
    });
    if (error || !data?.[0]) return { error: "Couldn't publish this Template." };
    revalidatePath("/my");
    revalidatePath(`/my/templates/${id}`);
    return { ok: true, shareSlug: data[0].share_slug, visibility: "public" };
  }

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const deleteAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("prompt_notebooks").update({
    visibility: "private",
    deleted_at: new Date().toISOString(),
    delete_after: deleteAfter,
  }).eq("id", id);
  revalidatePath("/my");
}

export async function restoreNotebookAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/my");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/my");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("prompt_notebooks").update({
    visibility: "private",
    deleted_at: null,
    delete_after: null,
  }).eq("id", id);
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

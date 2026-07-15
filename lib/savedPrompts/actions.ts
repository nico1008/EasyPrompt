"use server";

/* Mutations for saved prompt configs. Every write re-checks getUser() and
 * relies on RLS (owner_id = auth.uid()). create/update return state for inline
 * UI in the Builder; rename/delete/duplicate are form actions that redirect. */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCommunityPrompt, getCommunityTemplate } from "@/lib/community/repo";
import { getTemplate } from "@/data/templates";
import { getUserTemplate } from "@/lib/userTemplates/repo";
import { nameSchema, parseAnswers, bodySchema, type AnswersInput } from "./schema";
import { parsePromptProvenance } from "@/lib/templates/provenance";
import { provenanceFromTemplate, type PromptTemplateProvenance } from "@/lib/templates/provenance";
import { curatedTemplateDefinition } from "@/lib/templates/adapters";

export type SaveState = { ok?: boolean; error?: string; savedId?: string };

function revalidateSavedPrompt(id: string): void {
  revalidatePath("/my");
  revalidatePath(`/my/prompts/${id}`);
  revalidatePath(`/my/prompts/${id}/edit`);
}

async function verifyPromptProvenance(
  provenance: PromptTemplateProvenance,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<PromptTemplateProvenance | null> {
  if (provenance.source_kind === "curated" && provenance.source_slug_snapshot) {
    const template = getTemplate(provenance.source_slug_snapshot);
    if (!template) return null;
    const definition = curatedTemplateDefinition(template);
    if (definition.revision.source_kind !== "curated" ||
      provenance.template_key !== definition.identity.template_key ||
      provenance.content_revision !== definition.revision.content_revision
    ) return null;
    return provenanceFromTemplate(definition);
  }

  if (provenance.source_kind !== "user") return null;
  const templateId = provenance.template_key.startsWith("user:") ? provenance.template_key.slice(5) : "";
  if (!templateId) return null;

  if (provenance.source_surface === "owned_private") {
    const template = await getUserTemplate(templateId);
    if (!template) return null;
    const { data: revisionId, error } = await supabase.rpc("snapshot_template_revision", {
      p_template_id: templateId,
      p_expected_edit_version: template.edit_version,
    });
    if (error || !revisionId) return null;
    return {
      template_key: `user:${templateId}`,
      source_kind: "user",
      source_surface: "owned_private",
      revision_id: revisionId,
      source_title_snapshot: template.title,
      source_slug_snapshot: template.share_slug ?? undefined,
      source_created_at: new Date().toISOString(),
    };
  }

  if (provenance.source_surface === "community_public" && provenance.source_slug_snapshot) {
    const community = await getCommunityTemplate(provenance.source_slug_snapshot);
    if (!community || community.kind !== "canonical") return null;
    if (community.definition.revision.source_kind !== "user" ||
      community.definition.identity.template_key !== provenance.template_key ||
      community.definition.revision.revision_id !== provenance.revision_id
    ) return null;
    return provenanceFromTemplate(community.definition);
  }
  return null;
}

/* ---------------------- create a manual (standalone) Prompt ---------------------
 * A Prompt written directly in the markdown editor — no source Template. Stores
 * the markdown in `body` (the source of truth for source_kind='manual'); answers
 * stay empty. visibility defaults to 'draft'. */
export async function createManualPromptAction(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to save." };

  const name = (formData.get("name") as string | null)?.trim() || "Untitled prompt";
  const nameCheck = nameSchema.safeParse(name);
  if (!nameCheck.success) return { error: nameCheck.error.issues[0].message };

  const bodyCheck = bodySchema.safeParse((formData.get("body") as string | null) ?? "");
  if (!bodyCheck.success) return { error: bodyCheck.error.issues[0].message };

  const suppliedProvenance = parsePromptProvenance(formData.get("provenance"));
  const provenance = suppliedProvenance ? await verifyPromptProvenance(suppliedProvenance, supabase) : null;
  const { data, error } = await supabase
    .from("saved_prompts")
    .insert({
      owner_id: user.id,
      name: nameCheck.data,
      source_kind: "manual",
      catalog_slug: null,
      user_template_id: null,
      answers: { fields: {}, checks: {} },
      body: bodyCheck.data,
      ...(provenance ? {
        template_key: provenance.template_key,
        template_revision_id: provenance.revision_id ?? null,
        template_content_revision: provenance.content_revision ?? null,
        source_surface: provenance.source_surface,
        source_title_snapshot: provenance.source_title_snapshot,
        source_author_snapshot: provenance.source_author_snapshot ?? null,
        source_slug_snapshot: provenance.source_slug_snapshot ?? null,
        source_created_at: provenance.source_created_at,
      } : {}),
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't save. Please try again." };

  revalidatePath("/my");
  return { ok: true, savedId: data.id };
}

/* ----------------------- update a manual Prompt's body ------------------------ */
export async function updateManualPromptAction(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to save." };

  const bodyCheck = bodySchema.safeParse((formData.get("body") as string | null) ?? "");
  if (!bodyCheck.success) return { error: bodyCheck.error.issues[0].message };

  const patch: { body: string; name?: string } = { body: bodyCheck.data };
  const name = (formData.get("name") as string | null)?.trim();
  if (name) {
    const nameCheck = nameSchema.safeParse(name);
    if (!nameCheck.success) return { error: nameCheck.error.issues[0].message };
    patch.name = nameCheck.data;
  }

  const { error } = await supabase.from("saved_prompts").update(patch).eq("id", id);
  if (error) return { error: "Couldn't save your changes." };

  revalidateSavedPrompt(id);
  return { ok: true, savedId: id };
}

/* --------------------------------- create --------------------------------- */
export async function createSavedPromptAction(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to save." };

  const name = (formData.get("name") as string | null)?.trim() || "Untitled prompt";
  const nameCheck = nameSchema.safeParse(name);
  if (!nameCheck.success) return { error: nameCheck.error.issues[0].message };

  const sourceKind = formData.get("source_kind");
  const answers = parseAnswers(formData.get("answers"));
  if (!answers.ok) return { error: answers.error };
  const body = bodySchema.safeParse((formData.get("generated_body") as string | null) ?? "");
  if (!body.success) return { error: body.error.issues[0].message };
  const provenance = parsePromptProvenance(formData.get("provenance"));
  if (!provenance) return { error: "Prompt source information is missing." };

  const sourceColumns = {
    body: body.data,
    template_key: provenance.template_key,
    template_revision_id: provenance.revision_id ?? null,
    template_content_revision: provenance.content_revision ?? null,
    source_surface: provenance.source_surface,
    source_title_snapshot: provenance.source_title_snapshot,
    source_author_snapshot: provenance.source_author_snapshot ?? null,
    source_slug_snapshot: provenance.source_slug_snapshot ?? null,
    source_created_at: provenance.source_created_at,
  };

  let row;
  if (sourceKind === "catalog") {
    const slug = formData.get("catalog_slug");
    if (typeof slug !== "string" || !slug) return { error: "Missing template." };
    const template = getTemplate(slug);
    if (!template || provenance.template_key !== `curated:${template.id}`) {
      return { error: "That Template is no longer available." };
    }
    row = {
      owner_id: user.id,
      name: nameCheck.data,
      source_kind: "catalog" as const,
      catalog_slug: slug,
      user_template_id: null,
      answers: answers.value,
      ...sourceColumns,
    };
  } else if (sourceKind === "user") {
    const tid = formData.get("user_template_id");
    if (typeof tid !== "string" || !tid) return { error: "Missing template." };
    const template = await getUserTemplate(tid);
    if (!template || provenance.template_key !== `user:${tid}`) {
      return { error: "That Template is no longer available." };
    }
    const { data: revisionId, error: revisionError } = await supabase.rpc("snapshot_template_revision", {
      p_template_id: tid,
      p_expected_edit_version: template.edit_version,
    });
    if (revisionError || !revisionId) return { error: "Couldn't freeze the Template revision." };
    row = {
      owner_id: user.id,
      name: nameCheck.data,
      source_kind: "user" as const,
      catalog_slug: null,
      user_template_id: tid,
      answers: answers.value,
      ...sourceColumns,
      template_revision_id: revisionId,
    };
  } else {
    return { error: "Unknown template source." };
  }

  const { data, error } = await supabase
    .from("saved_prompts")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't save. Please try again." };

  revalidatePath("/my");
  return { ok: true, savedId: data.id };
}

/* ----------------------- update answers (re-save) ------------------------- */
export async function updateSavedPromptAnswersAction(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to save." };

  const answers = parseAnswers(formData.get("answers"));
  if (!answers.ok) return { error: answers.error };

  const patch: { answers: AnswersInput; name?: string } = {
    answers: answers.value,
  };
  const name = (formData.get("name") as string | null)?.trim();
  if (name) {
    const nameCheck = nameSchema.safeParse(name);
    if (!nameCheck.success) return { error: nameCheck.error.issues[0].message };
    patch.name = nameCheck.data;
  }

  const { error } = await supabase.from("saved_prompts").update(patch).eq("id", id);
  if (error) return { error: "Couldn't save your changes." };

  revalidateSavedPrompt(id);
  return { ok: true, savedId: id };
}

/* --------------------------------- rename --------------------------------- */
export async function renameSavedPromptAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/my");
  const id = formData.get("id");
  const name = (formData.get("name") as string | null)?.trim();
  if (typeof id !== "string" || !id || !name) redirect("/my");

  const nameCheck = nameSchema.safeParse(name);
  if (!nameCheck.success) redirect("/my");

  const supabase = await createClient();
  await supabase.from("saved_prompts").update({ name: nameCheck.data }).eq("id", id);
  revalidatePath("/my");
}

/* --------------------------------- delete --------------------------------- */
export async function deleteSavedPromptAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/my");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/my");

  const supabase = await createClient();
  await supabase.from("saved_prompts").delete().eq("id", id);
  revalidatePath("/my");
}

/* ------------------------------- duplicate -------------------------------- */
export async function duplicateSavedPromptAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/my");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/my");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: src } = await supabase
    .from("saved_prompts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!src) redirect("/my");

  await supabase.from("saved_prompts").insert({
    owner_id: user.id,
    name: `${src.name} (copy)`,
    source_kind: src.source_kind,
    catalog_slug: src.catalog_slug,
    user_template_id: src.user_template_id,
    answers: src.answers,
    body: src.body,
    category: src.category,
    remixed_from: src.remixed_from,
    template_key: src.template_key,
    template_revision_id: src.template_revision_id,
    template_content_revision: src.template_content_revision,
    source_surface: src.source_surface,
    source_title_snapshot: src.source_title_snapshot,
    source_author_snapshot: src.source_author_snapshot,
    source_slug_snapshot: src.source_slug_snapshot,
    source_snapshot: src.source_snapshot,
    source_created_at: src.source_created_at,
  });
  revalidatePath("/my");
}

/* --------------------- "Use as starting point" (remix) ---------------------
 * Seed a NEW manual Prompt in the caller's library from a public community
 * Prompt's text, recording a structured `remixed_from` pointer for attribution.
 * Form action → opens the new prompt in the editor. */
export async function remixPublicPromptAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/prompts");
  const slug = formData.get("share_slug");
  if (typeof slug !== "string" || !slug) redirect("/prompts");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/prompts/${slug}`);

  const detail = await getCommunityPrompt(slug);
  if (!detail) redirect("/prompts");

  const { data: created } = await supabase
    .from("saved_prompts")
    .insert({
      owner_id: user.id,
      name: `${detail.name} (remix)`,
      source_kind: "manual",
      catalog_slug: null,
      user_template_id: null,
      answers: { fields: {}, checks: {} },
      body: detail.text || `# ${detail.name}\n`,
      remixed_from: detail.id,
    })
    .select("id")
    .single();

  revalidatePath("/my");
  redirect(created?.id ? `/my/prompts/${created.id}` : "/my");
}

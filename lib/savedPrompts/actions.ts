"use server";

/* Mutations for saved prompt configs. Every write re-checks getUser() and
 * relies on RLS (owner_id = auth.uid()). create/update return state for inline
 * UI in the Builder; rename/delete/duplicate are form actions that redirect. */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { nameSchema, parseAnswers, bodySchema, type AnswersInput } from "./schema";

export type SaveState = { ok?: boolean; error?: string; savedId?: string };

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

  revalidatePath("/my");
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

  let row;
  if (sourceKind === "catalog") {
    const slug = formData.get("catalog_slug");
    if (typeof slug !== "string" || !slug) return { error: "Missing template." };
    row = {
      owner_id: user.id,
      name: nameCheck.data,
      source_kind: "catalog" as const,
      catalog_slug: slug,
      user_template_id: null,
      answers: answers.value,
    };
  } else if (sourceKind === "user") {
    const tid = formData.get("user_template_id");
    if (typeof tid !== "string" || !tid) return { error: "Missing template." };
    row = {
      owner_id: user.id,
      name: nameCheck.data,
      source_kind: "user" as const,
      catalog_slug: null,
      user_template_id: tid,
      answers: answers.value,
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

  revalidatePath("/my");
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
  });
  revalidatePath("/my");
}

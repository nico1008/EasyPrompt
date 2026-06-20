"use server";

/* Mutations for user templates. Each one re-checks the session with getUser()
 * and relies on RLS so a write can only ever touch the caller's own rows.
 * The editor serializes the whole template to a JSON `payload` field. */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { validateUserTemplate } from "./validate";

export type EditorState = { ok?: boolean; errors?: string[] };

const NOT_CONFIGURED: EditorState = { errors: ["Accounts aren't set up on this deployment."] };

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "template"
  );
}

function parsePayload(formData: FormData): unknown {
  const raw = formData.get("payload");
  try {
    return JSON.parse(typeof raw === "string" ? raw : "{}");
  } catch {
    return null;
  }
}

/* --------------------------------- create --------------------------------- */
export async function createUserTemplateAction(
  _prev: EditorState,
  formData: FormData
): Promise<EditorState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const payload = parsePayload(formData);
  if (payload === null) return { errors: ["Couldn't read the form. Please try again."] };
  const result = validateUserTemplate(payload);
  if (!result.ok) return { errors: result.errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: ["Please log in again."] };

  const v = result.value;
  const base = slugify(v.title);
  const row = {
    owner_id: user.id,
    title: v.title,
    category: v.category,
    icon: v.icon,
    tag: v.tag ?? null,
    blurb: v.blurb ?? null,
    intro: v.intro ?? null,
    base_prompt: v.base_prompt,
    fields: v.fields,
    checkboxes: v.checkboxes,
    is_public: false, // sharing seam parked — never write a public row (see validate.ts)
  };

  // Insert; if the (owner_id, slug) pair collides, retry once with a suffix.
  let insert = await supabase
    .from("user_templates")
    .insert({ ...row, slug: base })
    .select("id")
    .single();
  if (insert.error?.code === "23505") {
    insert = await supabase
      .from("user_templates")
      .insert({ ...row, slug: `${base}-${Date.now().toString(36).slice(-4)}` })
      .select("id")
      .single();
  }
  if (insert.error || !insert.data) {
    return { errors: ["Couldn't save the template. Please try again."] };
  }

  revalidatePath("/my");
  redirect(`/my/templates/${insert.data.id}?flash=created`);
}

/* --------------------------------- update --------------------------------- */
export async function updateUserTemplateAction(
  _prev: EditorState,
  formData: FormData
): Promise<EditorState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { errors: ["Missing template id."] };

  const payload = parsePayload(formData);
  if (payload === null) return { errors: ["Couldn't read the form. Please try again."] };
  const result = validateUserTemplate(payload);
  if (!result.ok) return { errors: result.errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: ["Please log in again."] };

  const v = result.value;
  const { error } = await supabase
    .from("user_templates")
    .update({
      title: v.title,
      category: v.category,
      icon: v.icon,
      tag: v.tag ?? null,
      blurb: v.blurb ?? null,
      intro: v.intro ?? null,
      base_prompt: v.base_prompt,
      fields: v.fields,
      checkboxes: v.checkboxes,
      is_public: false, // sharing seam parked — never write a public row (see validate.ts)
    })
    .eq("id", id);

  if (error) return { errors: ["Couldn't save your changes. Please try again."] };

  revalidatePath("/my");
  revalidatePath(`/my/templates/${id}`);
  redirect(`/my/templates/${id}?flash=updated`);
}

/* --------------------------------- delete --------------------------------- */
export async function deleteUserTemplateAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/my");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/my");

  const supabase = await createClient();
  await supabase.from("user_templates").delete().eq("id", id);
  revalidatePath("/my");
}

/* ------------------------------- duplicate -------------------------------- */
export async function duplicateUserTemplateAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/my");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/my");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: src } = await supabase
    .from("user_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!src) redirect("/my");

  const base = `${slugify(src.title)}-copy`;
  await supabase.from("user_templates").insert({
    owner_id: user.id,
    slug: `${base}-${Date.now().toString(36).slice(-4)}`,
    title: `${src.title} (copy)`,
    category: src.category,
    icon: src.icon,
    tag: src.tag,
    blurb: src.blurb,
    intro: src.intro,
    base_prompt: src.base_prompt,
    fields: src.fields,
    checkboxes: src.checkboxes,
    is_public: false,
  });

  revalidatePath("/my");
}

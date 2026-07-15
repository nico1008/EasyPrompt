"use server";

/* One visibility model for both objects (Templates: notebooks + user_templates;
 * Prompts: saved_prompts):
 *   - visibility is private or public
 *   - share_slug is minted lazily on first public exposure and then persists, so
 *     returning to private makes the link dormant without churning the slug.
 * RLS keeps every write owner-only. */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { makeShareSlug } from "@/lib/notebooks/share";
import { buildPrompt } from "@/lib/buildPrompt";
import { getTemplate } from "@/data/templates";
import { normalizeCategory, promptPublicVisibilityError } from "./publishGuard";
import { getNotebook } from "@/lib/notebooks/repo";
import { getUserTemplate } from "@/lib/userTemplates/repo";
import { rowToTemplate } from "@/lib/userTemplates/map";
import { getSavedPrompt, type SavedPromptRow } from "@/lib/savedPrompts/repo";
import { rowToAnswers } from "@/lib/savedPrompts/map";
import { rowToNotebook } from "@/lib/notebooks/map";
import { blockDocSaveError } from "@/lib/blocks/schema";

const schema = z.object({
  internal: z.enum(["notebook", "user_template", "saved_prompt"]),
  id: z.string().uuid(),
  visibility: z.enum(["private", "public"]),
});

export type VisibilityState = { ok?: boolean; error?: string };
type InternalKind = z.infer<typeof schema>["internal"];

async function currentSlug(
  internal: "notebook" | "user_template" | "saved_prompt",
  id: string
): Promise<{ found: boolean; slug: string | null }> {
  if (internal === "notebook") {
    const r = await getNotebook(id);
    return { found: !!r, slug: r?.share_slug ?? null };
  }
  if (internal === "user_template") {
    const r = await getUserTemplate(id);
    return { found: !!r, slug: r?.share_slug ?? null };
  }
  const r = await getSavedPrompt(id);
  return { found: !!r, slug: r?.share_slug ?? null };
}

/** Recompute a Prompt's text so a public copy renders without owner-scoped reads. */
async function computePromptText(row: SavedPromptRow): Promise<string> {
  if (row.source_kind === "catalog" && row.catalog_slug) {
    const t = getTemplate(row.catalog_slug);
    if (t) return buildPrompt(t, rowToAnswers(row, t)).text;
  }
  if (row.source_kind === "user" && row.user_template_id) {
    const ut = await getUserTemplate(row.user_template_id);
    if (ut) {
      const t = rowToTemplate(ut);
      return buildPrompt(t, rowToAnswers(row, t)).text;
    }
  }
  return row.body ?? "";
}

function targetKindForRpc(internal: InternalKind): "notebook" | "user_template" | "saved_prompt" {
  return internal;
}

export async function setVisibilityAction(
  _prev: VisibilityState,
  formData: FormData
): Promise<VisibilityState> {
  const parsed = schema.safeParse({
    internal: formData.get("internal"),
    id: formData.get("id"),
    visibility: formData.get("visibility"),
  });
  if (!parsed.success) return { error: "Invalid request." };
  const { internal, id, visibility } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in again." };

  const { found, slug } = await currentSlug(internal, id);
  if (!found) return { error: "Not found." };

  const category = normalizeCategory(formData.get("category"));

  const shareSlug = visibility === "public" && !slug ? makeShareSlug() : null;

  if (visibility === "public" && internal === "notebook") {
    const row = await getNotebook(id);
    if (!row) return { error: "Not found." };
    const saveError = blockDocSaveError(rowToNotebook(row).doc);
    if (saveError) {
      return { error: "Add content or a reusable input before making this Template public." };
    }
  }

  if (visibility === "public" && internal === "user_template") {
    const row = await getUserTemplate(id);
    if (!row || !row.base_prompt.trim()) {
      return { error: "Add content before making this Template public." };
    }
  }

  if (internal === "saved_prompt") {
    const row = await getSavedPrompt(id);
    if (!row) return { error: "Not found." };

    const promptPatch: { category?: string; body?: string } = {};
    if (category) promptPatch.category = category;

    if (visibility === "public") {
      const body = await computePromptText(row);
      const err = promptPublicVisibilityError(body, category ?? row.category);
      if (err) return { error: err };
      if (body.trim()) promptPatch.body = body;
    }

    if (Object.keys(promptPatch).length > 0) {
      const { error } = await supabase
        .from("saved_prompts")
        .update(promptPatch)
        .eq("id", id);
      if (error) return { error: "Couldn't update. Please try again." };
    }
  }

  const { error } = await supabase.rpc("set_content_visibility", {
    p_target_kind: targetKindForRpc(internal),
    p_target_id: id,
    p_visibility: visibility,
    p_share_slug: shareSlug,
  });

  if (error) return { error: "Couldn't update. Please try again." };
  revalidatePath("/my");
  return { ok: true };
}

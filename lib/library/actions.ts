"use server";

/* One publishing/sharing model for both objects (Templates: notebooks +
 * user_templates; Prompts: saved_prompts), following the 0007 state machine:
 *   - visibility ∈ draft | unlisted | published
 *   - share_slug is minted lazily on first Share/Publish and then PERSISTS, so a
 *     re-drafted item keeps a stable (but dormant) link.
 * RLS keeps every write owner-only. */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { makeShareSlug } from "@/lib/notebooks/share";
import { buildPrompt } from "@/lib/buildPrompt";
import { getTemplate } from "@/data/templates";
import { normalizeCategory, promptPublishError } from "./publishGuard";
import { getNotebook } from "@/lib/notebooks/repo";
import { getUserTemplate } from "@/lib/userTemplates/repo";
import { rowToTemplate } from "@/lib/userTemplates/map";
import { getSavedPrompt, type SavedPromptRow } from "@/lib/savedPrompts/repo";
import { rowToAnswers } from "@/lib/savedPrompts/map";

const schema = z.object({
  internal: z.enum(["notebook", "user_template", "saved_prompt"]),
  id: z.string().uuid(),
  visibility: z.enum(["draft", "published", "unlisted"]),
});

export type VisibilityState = { ok?: boolean; error?: string };

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

/** Recompute a Prompt's text so a published/unlisted copy renders without needing
 *  owner-scoped reads (frozen into saved_prompts.body). */
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

  const { found, slug } = await currentSlug(internal, id);
  if (!found) return { error: "Not found." };

  const category = normalizeCategory(formData.get("category"));

  const update: Record<string, unknown> = { visibility };
  if (visibility !== "draft" && !slug) update.share_slug = makeShareSlug();

  if (internal === "saved_prompt") {
    const row = await getSavedPrompt(id);
    if (!row) return { error: "Not found." };

    // A (re)selected category persists regardless of visibility, so it can be set
    // before publishing.
    if (category) update.category = category;

    if (visibility !== "draft") {
      const body = await computePromptText(row);
      // Publishing a Prompt to the community requires real content + a category;
      // unlisted (private link) stays unrestricted.
      if (visibility === "published") {
        const err = promptPublishError(body, category ?? row.category);
        if (err) return { error: err };
      }
      if (body.trim()) update.body = body;
    }
  }

  const supabase = await createClient();
  const u = update as never; // one Update shape across a typed table union
  const res =
    internal === "notebook"
      ? await supabase.from("prompt_notebooks").update(u).eq("id", id)
      : internal === "user_template"
        ? await supabase.from("user_templates").update(u).eq("id", id)
        : await supabase.from("saved_prompts").update(u).eq("id", id);

  if (res.error) return { error: "Couldn't update. Please try again." };
  revalidatePath("/my");
  return { ok: true };
}

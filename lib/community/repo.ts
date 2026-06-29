import "server-only";

/* Server reads for community public content via the security-definer
 * community_* RPCs (exact-slug, visibility-gated). Used by the public detail
 * routes for rich, indexable rendering. Anon-safe. */

import { createPublicClient } from "@/lib/supabase/server";
import { buildPrompt, buildPromptFromBlocks, type Answers } from "@/lib/buildPrompt";
import { getTemplate } from "@/data/templates";
import type { BlockDoc } from "@/lib/blocks/types";
import type { CommunityAuthor } from "./map";

export type CommunityPromptDetail = {
  id: string;
  name: string;
  text: string;
  visibility: "public";
  /** Catalog template this prompt was filled from, if any. */
  sourceSlug: string | null;
  author: CommunityAuthor | null;
};

export async function getCommunityPrompt(slug: string): Promise<CommunityPromptDetail | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("community_prompt", { p_slug: slug });
  if (error || !data || data.length === 0) return null;
  const row = data[0];

  let text = row.body && row.body.trim() ? row.body : "";
  if (!text && row.source_kind === "catalog" && row.catalog_slug) {
    const t = getTemplate(row.catalog_slug);
    if (t) {
      const answers = (row.answers as unknown as Answers | null) ?? { fields: {}, checks: {} };
      text = buildPrompt(t, answers).text;
    }
  }

  return {
    id: row.id,
    name: row.name,
    text,
    visibility: "public",
    sourceSlug: row.catalog_slug,
    author: row.author_username
      ? { username: row.author_username, displayName: row.author_display_name }
      : null,
  };
}

export type CommunityTemplateDetail = {
  title: string;
  text: string;
  visibility: "public";
  author: CommunityAuthor | null;
};

export async function getCommunityTemplate(slug: string): Promise<CommunityTemplateDetail | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("community_template", { p_slug: slug });
  if (error || !data || data.length === 0) return null;
  const row = data[0];

  let text = "";
  if (row.kind === "notebook") {
    const doc = (row.payload as { doc?: BlockDoc }).doc;
    text = doc ? buildPromptFromBlocks(doc).text : "";
  } else {
    // user_template: preview its base prompt skeleton (full anon fill-in is a follow-up).
    text = ((row.payload as { base_prompt?: string }).base_prompt ?? "").trim();
  }

  return {
    title: row.title,
    text,
    visibility: "public",
    author: row.author_username
      ? { username: row.author_username, displayName: row.author_display_name }
      : null,
  };
}

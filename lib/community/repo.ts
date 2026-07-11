import "server-only";

/* Server reads for community public content via the security-definer
 * community_* RPCs (exact-slug, visibility-gated). Used by the public detail
 * routes for rich, indexable rendering. Anon-safe. */

import { createPublicClient } from "@/lib/supabase/server";
import { buildPrompt, type Answers } from "@/lib/buildPrompt";
import { getTemplate } from "@/data/templates";
import {
  promptRowToCard,
  templateRowToCard,
  type CommunityAuthor,
  type CommunityCard,
} from "./map";
import {
  communityTemplateFromRow,
  type CommunityTemplateDetail,
} from "./template";

export type { CommunityTemplateDetail } from "./template";

export type CommunityPromptDetail = {
  id: string;
  name: string;
  text: string;
  visibility: "public";
  /** Catalog template this prompt was filled from, if any. */
  sourceSlug: string | null;
  author: CommunityAuthor | null;
};

export async function listCommunityPrompts(
  limit = 24,
  offset = 0
): Promise<CommunityCard[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("published_prompts", {
      p_limit: limit,
      p_offset: offset,
    });
    if (error || !data) return [];
    return data.map(promptRowToCard);
  } catch {
    return [];
  }
}

export async function listCommunityTemplates(
  limit = 24,
  offset = 0,
  category: string | null = null
): Promise<CommunityCard[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("published_templates", {
      p_limit: limit,
      p_offset: offset,
      p_category: category,
    });
    if (error || !data) return [];
    return data.map(templateRowToCard);
  } catch {
    return [];
  }
}

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
    author: row.author_username ? { username: row.author_username } : null,
  };
}

export async function getCommunityTemplate(slug: string): Promise<CommunityTemplateDetail | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("community_template", { p_slug: slug });
  if (error || !data || data.length === 0) return null;
  return communityTemplateFromRow(slug, data[0]);
}

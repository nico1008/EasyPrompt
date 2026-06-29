/* Pure mapping for public community content -> a unified card model.
 * Shared by the client listing helpers and unit tests. A public Prompt's blurb
 * is derived from the first prose line of its frozen body (public prompts always
 * have `body`); Templates carry their own blurb/category/icon. */

import type { IconName } from "@/components/iconNames";

export type CommunityAuthor = { username: string; displayName: string | null };

export type CommunityCard = {
  objectType: "prompt" | "template";
  /** share_slug — the public URL segment. */
  slug: string;
  title: string;
  blurb: string;
  icon: IconName;
  tag: string;
  category: string | null;
  href: string;
  author: CommunityAuthor | null;
  /** ISO timestamp — the item's true recency for sorting. */
  createdAt: string;
};

const MAX_BLURB = 120;

/** First meaningful line of a markdown body (skips headings/blank lines), trimmed. */
export function blurbFromBody(body: string | null | undefined, fallback = "A community prompt."): string {
  if (!body) return fallback;
  const lines = body.split(/\r?\n/);
  let pick = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue; // markdown heading
    pick = line.replace(/^[-*>]\s+/, ""); // strip a leading bullet/quote marker
    break;
  }
  if (!pick) {
    // body was only headings — fall back to the first non-empty line, sans '#'.
    pick = (lines.find((l) => l.trim()) ?? "").replace(/^#+\s*/, "").trim();
  }
  if (!pick) return fallback;
  return pick.length > MAX_BLURB ? `${pick.slice(0, MAX_BLURB - 1).trimEnd()}…` : pick;
}

function authorOf(username: string | null, displayName: string | null): CommunityAuthor | null {
  return username ? { username, displayName } : null;
}

export type PublicPromptRow = {
  share_slug: string;
  name: string;
  /** First ~300 chars of the frozen body (full body is fetched lazily on Copy). */
  preview: string | null;
  category: string | null;
  created_at: string;
  author_username: string | null;
  author_display_name: string | null;
};

export function promptRowToCard(row: PublicPromptRow): CommunityCard {
  return {
    objectType: "prompt",
    slug: row.share_slug,
    title: row.name || "Untitled prompt",
    blurb: blurbFromBody(row.preview),
    icon: "letter",
    tag: "Community",
    category: row.category,
    href: `/prompts/${row.share_slug}`,
    author: authorOf(row.author_username, row.author_display_name),
    createdAt: row.created_at,
  };
}

export type PublicTemplateRow = {
  share_slug: string;
  title: string;
  category: string | null;
  icon: string | null;
  tag: string | null;
  blurb: string | null;
  created_at: string;
  author_username: string | null;
  author_display_name: string | null;
};

export function templateRowToCard(row: PublicTemplateRow): CommunityCard {
  return {
    objectType: "template",
    slug: row.share_slug,
    title: row.title || "Untitled template",
    blurb: row.blurb?.trim() || "A community template.",
    icon: (row.icon as IconName) || "list",
    tag: row.tag?.trim() || "Community",
    category: row.category,
    href: `/p/${row.share_slug}`,
    author: authorOf(row.author_username, row.author_display_name),
    createdAt: row.created_at,
  };
}

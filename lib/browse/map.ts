/* Pure normalizers: house data (EXAMPLE_PROMPTS / TEMPLATES) and community cards
 * → one unified browse item per object type. Shared by the browse clients and unit
 * tests. No server-only imports. */

import { displayTitle, questionCount } from "@/data/templates";
import type { Template } from "@/data/types";
import type { ExamplePrompt } from "@/data/prompts";
import type { CommunityCard } from "@/lib/community/map";
import type { BrowsePromptItem, BrowseTemplateItem, Origin } from "./types";

/** Title → a url-safe `<x>.md` filename for the card heading. */
function fileNameFromTitle(title: string, fallback = "prompt"): string {
  const base =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback;
  return `${base}.md`;
}

export function examplePromptToItem(p: ExamplePrompt): BrowsePromptItem {
  return {
    key: `house-${p.id}`,
    origin: "house",
    slug: p.slug,
    href: `/prompts/${p.slug}`,
    fileName: `${p.slug}.md`,
    title: p.title,
    blurb: p.blurb,
    tag: p.tag,
    category: p.category,
    metricKind: "example_prompt",
    body: p.body,
    bookmark: { kind: "example_prompt", key: p.slug },
    creator: { kind: "house" },
    recency: p.added ?? 0,
    popular: Boolean(p.popular),
  };
}

export function communityPromptToItem(c: CommunityCard): BrowsePromptItem {
  return {
    key: `community-${c.slug}`,
    origin: "community",
    slug: c.slug,
    href: c.href,
    fileName: fileNameFromTitle(c.title),
    title: c.title,
    blurb: c.blurb,
    tag: c.tag,
    category: c.category,
    metricKind: "user_prompt",
    body: null,
    bookmark: null,
    creator: { kind: "community", author: c.author },
    recency: Date.parse(c.createdAt) || 0,
    popular: false,
  };
}

export function catalogTemplateToItem(t: Template): BrowseTemplateItem {
  return {
    key: `house-${t.id}`,
    origin: "house",
    slug: t.slug,
    href: `/templates/${t.slug}`,
    title: displayTitle(t),
    blurb: t.blurb,
    icon: t.icon,
    tag: t.tag,
    category: t.category,
    metricKind: "catalog",
    popular: Boolean(t.popular),
    questionCount: questionCount(t),
    showRating: true,
    bookmark: { kind: "catalog", key: t.slug },
    creator: { kind: "house" },
    recency: t.added ?? 0,
  };
}

export function communityTemplateToItem(c: CommunityCard): BrowseTemplateItem {
  return {
    key: `community-${c.slug}`,
    origin: "community",
    slug: c.slug,
    href: c.href,
    title: c.title,
    blurb: c.blurb,
    icon: c.icon,
    tag: c.tag,
    category: c.category,
    metricKind: "user_template",
    popular: false,
    questionCount: null,
    showRating: false,
    bookmark: null,
    creator: { kind: "community", author: c.author },
    recency: Date.parse(c.createdAt) || 0,
  };
}

/** Stable two-key order: house before community (the curated spine), then each
 *  bucket by its own *true* recency (newest first). Never zeroes a real timestamp
 *  — origins are bucketed, so their differing recency scales never cross-compare.
 *  Used as the "new" sort and as the final tiebreak in other sorts. */
export function byOriginThenRecency(
  a: { origin: Origin; recency: number },
  b: { origin: Origin; recency: number }
): number {
  if (a.origin !== b.origin) return a.origin === "house" ? -1 : 1;
  return b.recency - a.recency;
}

/* Resolve a bookmarks DB row to the catalog Template or example Prompt it points
 * at, for the "My Library" Favorites view. Pure — no server-only imports — so it's
 * usable on the server and in tests. Unknown keys (a since-removed item) resolve
 * to null on both and are dropped by the library page. */

import type { Database } from "@/lib/supabase/types";
import type { Template } from "@/data/types";
import { getTemplate } from "@/data/templates";
import { getExamplePrompt, type ExamplePrompt } from "@/data/prompts";

export type BookmarkRow = Database["public"]["Tables"]["bookmarks"]["Row"];

export type BookmarkKind = "catalog" | "example_prompt" | "user_template" | "user_prompt";

export type Bookmark = {
  id: string;
  target: { kind: BookmarkKind; key: string };
  /** Set when the bookmark points at a catalog Template. */
  template: Template | null;
  /** Set when the bookmark points at a curated example Prompt. */
  prompt: ExamplePrompt | null;
};

export function rowToBookmark(row: BookmarkRow): Bookmark {
  const kind = (
    row.target_kind === "example_prompt" ||
    row.target_kind === "user_template" ||
    row.target_kind === "user_prompt"
      ? row.target_kind
      : "catalog"
  ) as BookmarkKind;
  return {
    id: row.id,
    target: { kind, key: row.target_key },
    template: kind === "catalog" ? getTemplate(row.target_key) ?? null : null,
    prompt: kind === "example_prompt" ? getExamplePrompt(row.target_key) ?? null : null,
  };
}

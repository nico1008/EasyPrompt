/* Resolve a bookmarks DB row to its catalog Template for the "My library" view.
 * Pure — no server-only imports — so it's usable on the server and in tests.
 * Unknown slugs (a since-removed catalog template) resolve to template: null and
 * are dropped by the library page. */

import type { Database } from "@/lib/supabase/types";
import type { Template } from "@/data/types";
import { getTemplate } from "@/data/templates";

export type BookmarkRow = Database["public"]["Tables"]["bookmarks"]["Row"];

export type Bookmark = {
  id: string;
  target: { kind: "catalog"; key: string };
  template: Template | null;
};

export function rowToBookmark(row: BookmarkRow): Bookmark {
  const template =
    row.target_kind === "catalog" ? getTemplate(row.target_key) ?? null : null;
  return {
    id: row.id,
    target: { kind: row.target_kind, key: row.target_key },
    template,
  };
}

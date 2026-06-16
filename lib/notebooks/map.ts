/* Hydrate a prompt_notebooks DB row's `doc` JSONB into a typed BlockDoc. Pure —
 * no server-only imports — so it's usable on the server and in tests. Mirrors
 * lib/savedPrompts/map.ts: the stored JSON is validated (blockDocSchema), and a
 * malformed/missing doc falls back to an empty notebook instead of throwing. */

import type { Database } from "@/lib/supabase/types";
import type { BlockDoc } from "@/lib/blocks/types";
import { validateBlockDoc } from "@/lib/blocks/schema";
import { emptyBlockDoc } from "@/lib/blocks/defaults";

export type NotebookRow = Database["public"]["Tables"]["prompt_notebooks"]["Row"];

export type Notebook = {
  id: string;
  name: string;
  doc: BlockDoc;
  /** Non-null when the prompt is publicly shared (the /p/<slug> token). */
  shareSlug: string | null;
};

export function rowToNotebook(row: NotebookRow): Notebook {
  const parsed = validateBlockDoc(row.doc);
  const doc = parsed.ok ? parsed.value : emptyBlockDoc(row.name);
  return { id: row.id, name: row.name, doc, shareSlug: row.share_slug ?? null };
}

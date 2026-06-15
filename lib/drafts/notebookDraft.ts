/* Pure helpers for the anonymous notebook draft (autosave a BlockDoc to
 * localStorage). The logged-out counterpart to prompt_notebooks — same role as
 * lib/drafts/draft.ts is to saved_prompts. Pure + SSR-agnostic so serialize/parse
 * are unit-testable; the React glue lives in useNotebookDraft.ts. */

import { blockDocSchema, MAX_NOTEBOOK_JSON } from "@/lib/blocks/schema";
import type { BlockDoc } from "@/lib/blocks/types";

/** localStorage key for a notebook draft. "new" for an unsaved notebook. */
export function notebookDraftKey(notebookId: string): string {
  return `easyprompt.notebook.${notebookId}`;
}

/** Serialize a notebook doc for storage, or null if it's too big to keep. */
export function serializeNotebookDraft(doc: BlockDoc): string | null {
  const json = JSON.stringify(doc);
  if (json.length > MAX_NOTEBOOK_JSON) return null;
  return json;
}

/** Parse a stored notebook draft back into a BlockDoc. Corrupt/oversized → null. */
export function parseNotebookDraft(raw: string | null | undefined): BlockDoc | null {
  if (typeof raw !== "string" || !raw || raw.length > MAX_NOTEBOOK_JSON) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = blockDocSchema.safeParse(json);
  if (!parsed.success) return null;
  const ids = parsed.data.blocks.map((b) => b.id);
  if (new Set(ids).size !== ids.length) return null;
  return parsed.data as BlockDoc;
}

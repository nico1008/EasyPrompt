"use client";

/* Autosave/restore glue for anonymous notebook drafts (BlockDoc). Thin wrapper
 * over useLocalDraft — SSR-safe restore-after-mount, debounced, size-capped. */

import type { BlockDoc } from "@/lib/blocks/types";
import { notebookDraftKey, parseNotebookDraft, serializeNotebookDraft } from "./notebookDraft";
import { useLocalDraft } from "./useLocalDraft";

export function useNotebookDraft(opts: {
  /** Notebook id — "new" for an unsaved notebook. Keys the draft. */
  notebookId: string;
  /** Off when reopening a saved notebook (the saved row wins). */
  enabled: boolean;
  /** Current doc to persist. */
  doc: BlockDoc;
  /** Whether the notebook has content worth keeping. */
  hasContent: boolean;
  /** Called once on mount with a restored draft, if one exists. */
  onRestore: (doc: BlockDoc) => void;
}): { clear: () => void } {
  return useLocalDraft<BlockDoc>({
    key: notebookDraftKey(opts.notebookId),
    enabled: opts.enabled,
    value: opts.doc,
    hasContent: opts.hasContent,
    serialize: serializeNotebookDraft,
    parse: parseNotebookDraft,
    onRestore: opts.onRestore,
  });
}

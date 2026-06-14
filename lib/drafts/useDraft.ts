"use client";

/* Autosave/restore glue for builder drafts. SSR-safe: the form always renders
 * with its server-computed answers first, then this hook restores a stored
 * draft *after mount* (no hydration mismatch — same pattern as the premium
 * client and useSupabaseUser). Writes are debounced; an empty form clears its
 * draft rather than persisting noise. */

import { useCallback, useEffect, useRef } from "react";
import type { Answers } from "@/lib/buildPrompt";
import { draftKey, parseDraft, serializeDraft } from "./draft";

const DEBOUNCE_MS = 400;

export function useDraft(opts: {
  /** Template id — the draft is keyed per template. */
  templateId: string;
  /** Off when reopening a saved prompt (the saved row wins) or when disabled. */
  enabled: boolean;
  /** Current answers to persist. */
  answers: Answers;
  /** Whether the form has any content worth keeping (skip storing empty drafts). */
  hasContent: boolean;
  /** Called once on mount with a restored draft, if one exists. */
  onRestore: (a: Answers) => void;
}): { clear: () => void } {
  const { templateId, enabled, answers, hasContent, onRestore } = opts;
  const key = draftKey(templateId);
  const ready = useRef(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  // Restore once, after mount. Marks `ready` so autosave doesn't run first.
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const draft = parseDraft(window.localStorage.getItem(key));
    if (draft) onRestoreRef.current(draft);
    ready.current = true;
  }, [key, enabled]);

  // Debounced autosave on change (only after the restore pass).
  useEffect(() => {
    if (!enabled || !ready.current || typeof window === "undefined") return;
    const handle = window.setTimeout(() => {
      const serialized = hasContent ? serializeDraft(answers) : null;
      if (serialized) window.localStorage.setItem(key, serialized);
      else window.localStorage.removeItem(key);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [answers, hasContent, enabled, key]);

  const clear = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  }, [key]);

  return { clear };
}

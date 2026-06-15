"use client";

/* Autosave/restore glue for classic builder drafts (Answers). Thin wrapper over
 * useLocalDraft — see that file for the SSR-safe restore-after-mount, debounce,
 * and empty-clears-the-draft behavior. Signature unchanged from when this hook
 * held the implementation, so the Builder call site is untouched. */

import type { Answers } from "@/lib/buildPrompt";
import { draftKey, parseDraft, serializeDraft } from "./draft";
import { useLocalDraft } from "./useLocalDraft";

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
  return useLocalDraft<Answers>({
    key: draftKey(opts.templateId),
    enabled: opts.enabled,
    value: opts.answers,
    hasContent: opts.hasContent,
    serialize: serializeDraft,
    parse: parseDraft,
    onRestore: opts.onRestore,
  });
}

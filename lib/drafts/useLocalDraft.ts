"use client";

/* Generic autosave/restore glue for a single localStorage value. SSR-safe: the
 * form renders with its server-computed value first, then this hook restores a
 * stored draft *after mount* (no hydration mismatch — same pattern as the
 * premium client and useSupabaseUser). Writes are debounced; an empty payload
 * clears its draft rather than persisting noise.
 *
 * useDraft (Answers) and useNotebookDraft (BlockDoc) are thin wrappers over
 * this — the serialize/parse pair makes it value-type-agnostic. */

import { useCallback, useEffect, useRef } from "react";

const DEBOUNCE_MS = 400;

export function useLocalDraft<T>(opts: {
  /** localStorage key (already namespaced by the caller). */
  key: string;
  /** Off when reopening a saved item (the saved row wins) or when disabled. */
  enabled: boolean;
  /** Current value to persist. */
  value: T;
  /** Whether there's content worth keeping (skip storing empty drafts). */
  hasContent: boolean;
  /** Serialize for storage, or null if too big / not worth keeping. */
  serialize: (value: T) => string | null;
  /** Parse a stored string back into a value. Corrupt/oversized → null. */
  parse: (raw: string | null | undefined) => T | null;
  /** Called once on mount with a restored draft, if one exists. */
  onRestore: (value: T) => void;
}): { clear: () => void } {
  const { key, enabled, value, hasContent, serialize, parse, onRestore } = opts;
  const ready = useRef(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
  const serializeRef = useRef(serialize);
  serializeRef.current = serialize;
  const parseRef = useRef(parse);
  parseRef.current = parse;

  // Restore once, after mount. Marks `ready` so autosave doesn't run first.
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const draft = parseRef.current(window.localStorage.getItem(key));
    if (draft) onRestoreRef.current(draft);
    ready.current = true;
  }, [key, enabled]);

  // Debounced autosave on change (only after the restore pass).
  useEffect(() => {
    if (!enabled || !ready.current || typeof window === "undefined") return;
    const handle = window.setTimeout(() => {
      const serialized = hasContent ? serializeRef.current(value) : null;
      if (serialized) window.localStorage.setItem(key, serialized);
      else window.localStorage.removeItem(key);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [value, hasContent, enabled, key]);

  const clear = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  }, [key]);

  return { clear };
}

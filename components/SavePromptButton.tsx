"use client";

/* "Save to my prompts" control for the Builder payoff step.
 *
 * The catalog builder pages are statically generated, so we can't know the user
 * server-side. This island checks account state client-side (a UI hint only — the
 * server action re-verifies) and renders one of: nothing (Supabase off),
 * a soft account prompt (anonymous), a name+save form (signed in), or a saved
 * confirmation. In edit mode (savedPromptId set) it re-saves that row instead. */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AuthGatedButton, currentAuthNext } from "@/components/AuthGatedButton";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseAccountState } from "@/lib/supabase/useUser";
import {
  createManualPromptAction,
  createSavedPromptAction,
  updateSavedPromptAnswersAction,
  type SaveState,
} from "@/lib/savedPrompts/actions";
import type { Answers } from "@/lib/buildPrompt";
import "./SavePromptButton.css";

export type SaveSource =
  | { kind: "catalog"; slug: string }
  | { kind: "user"; userTemplateId: string }
  | { kind: "community"; slug: string };

const EMPTY: SaveState = {};

function saveSnapshot(name: string, answers: Answers, customBody?: string): string {
  return JSON.stringify({ name: name.trim() || "Untitled prompt", answers, customBody });
}

function SaveSubmit({
  label,
  variant,
  disabled = false,
}: {
  label: string;
  variant: "primary" | "outline";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const cls = variant === "outline" ? "btn btn-ghost btn-sm" : "btn btn-primary btn-sm";
  return (
    <button className={cls} type="submit" disabled={pending || disabled}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function SavePromptButton({
  source,
  answers,
  defaultName,
  savedPromptId,
  customBody,
  onSaved,
  onAuthGateNavigate,
  authGateNext,
  variant = "primary",
}: {
  source: SaveSource;
  answers: Answers;
  defaultName: string;
  savedPromptId?: string;
  /** When set, the prompt has been hand-edited away from the form: save the exact
   *  markdown as a standalone (manual) Prompt instead of the template answers.
   *  In edit mode this means "Save as new prompt" (the original row is untouched). */
  customBody?: string;
  /** Fired once when a save succeeds — lets the Builder clear its local draft. */
  onSaved?: () => void;
  /** Fired before the user leaves for auth from the soft gate. */
  onAuthGateNavigate?: () => void;
  /** Same-site return path for the auth gate. Defaults to the current URL. */
  authGateNext?: () => string;
  /** Visual weight of the submit button. "outline" demotes it below a primary Copy. */
  variant?: "primary" | "outline";
}) {
  const editing = Boolean(savedPromptId);
  const custom = customBody !== undefined;
  const customIsEmpty = custom && !customBody.trim();
  // Custom (hand-edited) text always forks to a new manual prompt; otherwise the
  // form's answers are saved (update in edit mode, create from the template fresh).
  const action = custom
    ? createManualPromptAction
    : editing
    ? updateSavedPromptAnswersAction
    : createSavedPromptAction;
  const [state, formAction] = useActionState(action, EMPTY);
  const saveLabel = custom
    ? editing
      ? "Save as new Prompt"
      : "Save Prompt"
    : editing
      ? "Update Prompt"
      : "Save Prompt";
  const [name, setName] = useState(defaultName);
  const currentSnapshot = useMemo(
    () => saveSnapshot(name, answers, customBody),
    [answers, customBody, name]
  );
  const currentSnapshotRef = useRef(currentSnapshot);
  const submittedSnapshotRef = useRef<string | null>(null);
  const handledStateRef = useRef<SaveState | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(() =>
    editing && !custom ? saveSnapshot(defaultName, answers) : null
  );
  const { account } = useSupabaseAccountState();
  currentSnapshotRef.current = currentSnapshot;
  const saved = editing && !custom && savedSnapshot === currentSnapshot;
  const stateIsCurrent = submittedSnapshotRef.current === currentSnapshot;

  // Once a save succeeds, let the parent drop its local draft and record the
  // payload that actually reached the server.
  useEffect(() => {
    if (!state.ok || handledStateRef.current === state) return;
    handledStateRef.current = state;
    onSaved?.();
    if (editing && !custom) {
      setSavedSnapshot(submittedSnapshotRef.current ?? currentSnapshotRef.current);
    }
  }, [state, editing, custom, onSaved]);

  if (!isSupabaseConfigured()) return null;

  if (!account) {
    return (
      <div className="save-prompt">
        <p className="save-hint">Want to keep this Prompt?</p>
        <AuthGatedButton
          className="btn btn-ink btn-sm"
          disabled={customIsEmpty}
          prompt={{
            title: "Save this Prompt",
            body: "Create an account to save and reuse.",
          }}
          next={authGateNext ?? (() => currentAuthNext("/templates"))}
          onBeforeAuthNavigate={onAuthGateNavigate}
        >
          {saveLabel}
        </AuthGatedButton>
      </div>
    );
  }

  if (state.ok && (!editing || custom)) {
    return (
      <div className="save-prompt save-done" role="status">
        <span className="save-ok">Saved ✓</span>
        <Link className="save-view" href="/my">
          View in My Library →
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="save-prompt"
      onSubmit={(e) => {
        if (saved) {
          e.preventDefault();
          return;
        }
        submittedSnapshotRef.current = currentSnapshot;
      }}
    >
      {custom ? (
        // Manual save: the exact markdown body, no answers/source/id (forks a new row).
        <input type="hidden" name="body" value={customBody} />
      ) : (
        <>
          <input type="hidden" name="answers" value={JSON.stringify(answers)} />
          {editing ? (
            <input type="hidden" name="id" value={savedPromptId} />
          ) : source.kind === "catalog" ? (
            <>
              <input type="hidden" name="source_kind" value="catalog" />
              <input type="hidden" name="catalog_slug" value={source.slug} />
            </>
          ) : source.kind === "user" ? (
            <>
              <input type="hidden" name="source_kind" value="user" />
              <input type="hidden" name="user_template_id" value={source.userTemplateId} />
            </>
          ) : null}
        </>
      )}
      <input
        className="input"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name this prompt"
        aria-label="Name this prompt"
        maxLength={120}
      />
      <SaveSubmit
        label={saved ? "Saved" : saveLabel}
        variant={variant}
        disabled={saved || customIsEmpty}
      />
      {stateIsCurrent && state.error && (
        <p className="save-err" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

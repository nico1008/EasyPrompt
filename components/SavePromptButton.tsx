"use client";

/* "Save to my prompts" control for the Builder payoff step.
 *
 * The catalog builder pages are statically generated, so we can't know the user
 * server-side. This island checks account state client-side (a UI hint only — the
 * server action re-verifies) and renders one of: nothing (Supabase off),
 * a soft account prompt (anonymous), a name+save form (signed in), or a saved
 * confirmation. In edit mode (savedPromptId set) it re-saves that row instead. */

import Link from "next/link";
import { useEffect, useState } from "react";
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
  | { kind: "user"; userTemplateId: string };

const EMPTY: SaveState = {};

function SaveSubmit({ label, variant }: { label: string; variant: "primary" | "outline" }) {
  const { pending } = useFormStatus();
  const cls = variant === "outline" ? "btn btn-ghost btn-sm" : "btn btn-primary btn-sm";
  return (
    <button className={cls} type="submit" disabled={pending}>
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
  // Custom (hand-edited) text always forks to a new manual prompt; otherwise the
  // form's answers are saved (update in edit mode, create from the template fresh).
  const action = custom
    ? createManualPromptAction
    : editing
    ? updateSavedPromptAnswersAction
    : createSavedPromptAction;
  const [state, formAction] = useActionState(action, EMPTY);
  const saveLabel = custom ? (editing ? "Save as new prompt" : "Save") : editing ? "Update" : "Save";
  const [name, setName] = useState(defaultName);
  const { account } = useSupabaseAccountState();

  // Once a save succeeds, let the parent drop its local draft.
  useEffect(() => {
    if (state.ok) onSaved?.();
  }, [state.ok, onSaved]);

  if (!isSupabaseConfigured()) return null;

  if (!account) {
    return (
      <div className="save-prompt">
        <p className="save-hint">Want to keep this Prompt?</p>
        <AuthGatedButton
          className="btn btn-ink btn-sm"
          prompt={{
            title: "Save this prompt",
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

  if (state.ok) {
    return (
      <div className="save-prompt save-done" role="status">
        <span className="save-ok">Saved ✓</span>
        <Link className="save-view" href="/my">
          View in My prompts →
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="save-prompt">
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
          ) : (
            <>
              <input type="hidden" name="source_kind" value="user" />
              <input type="hidden" name="user_template_id" value={source.userTemplateId} />
            </>
          )}
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
      <SaveSubmit label={saveLabel} variant={variant} />
      {state.error && (
        <p className="save-err" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

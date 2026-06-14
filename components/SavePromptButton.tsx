"use client";

/* "Save to my prompts" control for the Builder payoff step.
 *
 * The catalog builder pages are statically generated, so we can't know the user
 * server-side. This island checks the session client-side (a UI hint only — the
 * server action re-verifies) and renders one of: nothing (Supabase off),
 * "Log in to save" (anonymous), a name+save form (signed in), or a saved
 * confirmation. In edit mode (savedPromptId set) it re-saves that row instead. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import {
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

function SaveSubmit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary btn-sm" type="submit" disabled={pending}>
      {pending ? "Saving…" : editing ? "Update" : "Save"}
    </button>
  );
}

export function SavePromptButton({
  source,
  answers,
  defaultName,
  savedPromptId,
  onSaved,
}: {
  source: SaveSource;
  answers: Answers;
  defaultName: string;
  savedPromptId?: string;
  /** Fired once when a save succeeds — lets the Builder clear its local draft. */
  onSaved?: () => void;
}) {
  const editing = Boolean(savedPromptId);
  const [state, formAction] = useActionState(
    editing ? updateSavedPromptAnswersAction : createSavedPromptAction,
    EMPTY
  );
  const [auth, setAuth] = useState<"checking" | "anon" | "ready">("checking");
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (active) setAuth(data.session ? "ready" : "anon");
      });
    return () => {
      active = false;
    };
  }, []);

  // Once a save succeeds, let the parent drop its local draft.
  useEffect(() => {
    if (state.ok) onSaved?.();
  }, [state.ok, onSaved]);

  if (!isSupabaseConfigured() || auth === "checking") return null;

  if (auth === "anon") {
    const next =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/prompts";
    return (
      <div className="save-prompt">
        <p className="save-hint">Want to keep this prompt?</p>
        <Link className="btn btn-ink btn-sm" href={`/login?next=${encodeURIComponent(next)}`}>
          Log in to save
        </Link>
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
      <input
        className="input"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name this prompt"
        aria-label="Name this prompt"
        maxLength={120}
      />
      <SaveSubmit editing={editing} />
      {state.error && (
        <p className="save-err" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

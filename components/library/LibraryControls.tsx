"use client";

/* Visibility UI for the My Library action dialog. The backend is single-sourced:
 * both Templates and Prompts write through setVisibilityAction. Public rows get a
 * stable share slug; private rows are owner-only and any old slug stays dormant. */

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import { setVisibilityAction, type VisibilityState } from "@/lib/library/actions";
import { CATEGORIES } from "@/data/templates";
import { copyText } from "@/lib/clipboard";
import type { LibraryInternal, LibraryVisibility } from "@/lib/library/list";

export function publicUrlFor(internal: LibraryInternal, slug: string | null): string {
  if (!slug || typeof window === "undefined") return "";
  const base = internal === "saved_prompt" ? "/prompts" : "/p";
  return `${window.location.origin}${base}/${slug}`;
}

function CopyLink({ url }: { url: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={() => {
        void copyText(url).then((ok) => {
          setStatus(ok ? "copied" : "failed");
          if (ok) window.setTimeout(() => setStatus("idle"), 1500);
        });
      }}
    >
      <Icon name={status === "copied" ? "check" : "copy"} size={14} />
      {status === "copied" ? "Copied" : status === "failed" ? "Try again" : "Copy link"}
    </button>
  );
}

function VisibilitySubmit({
  current,
  selected,
  disabled,
}: {
  current: LibraryVisibility;
  selected: LibraryVisibility;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  let label = "Save visibility";
  if (selected !== current) label = selected === "public" ? "Change to public" : "Change to private";

  return (
    <button type="submit" className="btn btn-primary btn-block" disabled={pending || disabled}>
      <Icon name={selected === "public" ? "share" : "shield"} size={15} />
      {pending ? "Saving…" : label}
    </button>
  );
}

export function VisibilitySection({
  internal,
  id,
  visibility,
  shareSlug,
  category,
}: {
  internal: LibraryInternal;
  id: string;
  visibility: LibraryVisibility;
  shareSlug: string | null;
  category?: string | null;
}) {
  const [state, action] = useActionState(setVisibilityAction, {} as VisibilityState);
  const [nextVisibility, setNextVisibility] = useState<LibraryVisibility>(visibility);
  const [cat, setCat] = useState(category ?? "");
  const isPrompt = internal === "saved_prompt";
  const signature = `${nextVisibility}:${cat}`;
  const [submittedSignature, setSubmittedSignature] = useState<string | null>(null);
  const stateIsCurrent = submittedSignature === signature;
  const categoryChanged = isPrompt && nextVisibility === "public" && cat !== (category ?? "");
  const changed = nextVisibility !== visibility || categoryChanged;
  const canSubmit = changed && (!isPrompt || nextVisibility !== "public" || Boolean(cat));
  const url = visibility === "public" ? publicUrlFor(internal, shareSlug) : "";

  useEffect(() => {
    setNextVisibility(visibility);
    setCat(category ?? "");
  }, [category, visibility]);

  return (
    <form
      action={action}
      className="lib-visibility"
      onSubmit={() => setSubmittedSignature(signature)}
    >
      <input type="hidden" name="internal" value={internal} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="visibility" value={nextVisibility} />

      <div className="lib-visibility-choices" role="radiogroup" aria-label="Visibility">
        <label className={`lib-vis-choice${nextVisibility === "private" ? " selected" : ""}`}>
          <input
            type="radio"
            name="visibility_choice"
            value="private"
            checked={nextVisibility === "private"}
            onChange={() => setNextVisibility("private")}
          />
          <span className="lib-vis-icon" aria-hidden="true">
            <Icon name="shield" size={16} />
          </span>
          <span>
            <strong>Private</strong>
            <em>Only you can see this.</em>
          </span>
        </label>

        <label className={`lib-vis-choice${nextVisibility === "public" ? " selected" : ""}`}>
          <input
            type="radio"
            name="visibility_choice"
            value="public"
            checked={nextVisibility === "public"}
            onChange={() => setNextVisibility("public")}
          />
          <span className="lib-vis-icon" aria-hidden="true">
            <Icon name="share" size={16} />
          </span>
          <span>
            <strong>Public</strong>
            <em>Anyone can view this and it can appear in community surfaces.</em>
          </span>
        </label>
      </div>

      {isPrompt && nextVisibility === "public" && (
        <label className="lib-cat-field">
          <span>
            Category <em>(required)</em>
          </span>
          <select
            name="category"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="Category (required for public prompts)"
            className={`select${cat ? "" : " is-empty"}`}
          >
            <option value="">Choose a category...</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {isPrompt && nextVisibility !== "public" && category && (
        <input type="hidden" name="category" value={category} />
      )}

      {url && (
        <div className="lib-public-link">
          <code className="lib-link-url" title={url}>
            {url}
          </code>
          <div className="lib-share-secondary">
            <CopyLink url={url} />
            <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">
              <Icon name="arrow-right" size={14} /> View public page
            </a>
          </div>
        </div>
      )}

      {stateIsCurrent && state.error && <p className="lib-err" role="alert">{state.error}</p>}
      {stateIsCurrent && state.ok && !changed && <p className="lib-ok" role="status">Visibility saved.</p>}

      <VisibilitySubmit current={visibility} selected={nextVisibility} disabled={!canSubmit} />
    </form>
  );
}

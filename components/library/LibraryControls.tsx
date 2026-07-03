"use client";

/* Visibility UI for the My Library action dialog. The backend is single-sourced:
 * both Templates and Prompts write through setVisibilityAction. Public rows get a
 * stable share slug; private rows are owner-only and any old slug stays dormant. */

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import { setVisibilityAction, type VisibilityState } from "@/lib/library/actions";
import { CATEGORIES } from "@/data/templates";
import type { LibraryInternal, LibraryVisibility } from "@/lib/library/list";

export function publicUrlFor(internal: LibraryInternal, slug: string | null): string {
  if (!slug || typeof window === "undefined") return "";
  const base = internal === "saved_prompt" ? "/prompts" : "/p";
  return `${window.location.origin}${base}/${slug}`;
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={() => {
        void navigator.clipboard?.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={14} />
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

function VisibilitySubmit({
  current,
  selected,
}: {
  current: LibraryVisibility;
  selected: LibraryVisibility;
}) {
  const { pending } = useFormStatus();
  let label = "Save visibility";
  if (selected !== current) label = selected === "public" ? "Change to public" : "Change to private";

  return (
    <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
      <Icon name={selected === "public" ? "share" : "shield"} size={15} />
      {pending ? "Saving..." : label}
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
  const url = useMemo(
    () => (visibility === "public" ? publicUrlFor(internal, shareSlug) : ""),
    [internal, shareSlug, visibility]
  );

  return (
    <form action={action} className="lib-visibility">
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

      {state.error && <p className="lib-err">{state.error}</p>}
      {state.ok && <p className="lib-ok">Visibility saved.</p>}

      <VisibilitySubmit current={visibility} selected={nextVisibility} />
    </form>
  );
}

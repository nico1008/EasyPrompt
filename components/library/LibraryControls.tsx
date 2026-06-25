"use client";

/* Publishing + sharing control for the My Library detail panel. Purpose-built for
 * the panel (a labelled segmented visibility chooser + helper text + contextual
 * category select + a Copy-link affordance) — NOT the old inline row. The backend
 * stays single-sourced: it drives the same setVisibilityAction state machine
 * (lib/library/actions.ts), so a share_slug is minted lazily and persists, and the
 * prompt publish gate (category + content) is enforced server-side. */

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import { setVisibilityAction, type VisibilityState } from "@/lib/library/actions";
import { CATEGORIES } from "@/data/templates";
import type { LibraryInternal, LibraryStatus } from "@/lib/library/list";

/** Public share-route base per internal type (null = no public route yet). */
function sharePathFor(internal: LibraryInternal): string | null {
  if (internal === "notebook") return "/p";
  if (internal === "saved_prompt") return "/s/p";
  return null; // user_template: visibility settable; public route is a follow-up
}

const VIS: { id: LibraryStatus; label: string; hint: string }[] = [
  { id: "draft", label: "Draft", hint: "Private — only you can see it." },
  { id: "unlisted", label: "Unlisted", hint: "Anyone with the link can view it." },
  { id: "published", label: "Published", hint: "Listed publicly for everyone." },
];

function Saving() {
  const { pending } = useFormStatus();
  return pending ? <span className="lib-share-saving">Saving…</span> : null;
}

export function LibraryControls({
  internal,
  id,
  status,
  shareSlug,
  category,
}: {
  internal: LibraryInternal;
  id: string;
  status: LibraryStatus;
  shareSlug: string | null;
  /** Prompt category (required to Publish). Only meaningful for saved_prompt. */
  category?: string | null;
}) {
  const [state, action] = useActionState(setVisibilityAction, {} as VisibilityState);
  const formRef = useRef<HTMLFormElement>(null);
  const [vis, setVis] = useState<LibraryStatus>(status);
  const [copied, setCopied] = useState(false);

  // Keep the chooser in sync with the server's truth: adopt the persisted status,
  // and revert an optimistic pick the action rejected (e.g. publish without category).
  useEffect(() => {
    setVis(status);
  }, [status, state.error]);

  const isPrompt = internal === "saved_prompt";
  const base = sharePathFor(internal);
  const url =
    shareSlug && base && typeof window !== "undefined"
      ? `${window.location.origin}${base}/${shareSlug}`
      : "";

  const submit = () => formRef.current?.requestSubmit();

  return (
    <div className="lib-share">
      <div className="lib-share-head">
        <h3>Sharing</h3>
        <Saving />
      </div>

      <form ref={formRef} action={action} className="lib-share-form">
        <input type="hidden" name="internal" value={internal} />
        <input type="hidden" name="id" value={id} />

        <div className="lib-vis-seg" role="radiogroup" aria-label="Visibility">
          {VIS.map((v) => (
            <label key={v.id} className={`lib-vis-opt${vis === v.id ? " on" : ""}`}>
              <input
                type="radio"
                name="visibility"
                value={v.id}
                checked={vis === v.id}
                onChange={() => {
                  setVis(v.id);
                  submit();
                }}
              />
              {v.label}
            </label>
          ))}
        </div>
        <p className="lib-vis-hint">{VIS.find((v) => v.id === vis)?.hint}</p>

        {isPrompt && (
          <label className="lib-cat-field">
            <span>Category {vis === "published" && <em>(required)</em>}</span>
            <select
              name="category"
              defaultValue={category ?? ""}
              aria-label="Category (required to publish)"
              className="select"
              onChange={submit}
            >
              <option value="">Choose a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </form>

      {url ? (
        <div className="lib-link-row">
          <code className="lib-link-url" title={url}>
            {url}
          </code>
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
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : (
        base && (
          <p className="lib-link-empty">Set Unlisted or Published to mint a shareable link.</p>
        )
      )}

      {state.error && <p className="lib-err">{state.error}</p>}
    </div>
  );
}

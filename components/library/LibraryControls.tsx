"use client";

/* Per-card publishing + sharing control for My Library. A visibility select
 * (Draft / Unlisted / Published) drives the shared setVisibilityAction; when the
 * item has a live share link, a Copy-link button appears. One control for both
 * object types — the action resolves the right table internally. */

import { useActionState, useRef, useState } from "react";
import { setVisibilityAction, type VisibilityState } from "@/lib/library/actions";
import type { LibraryInternal, LibraryStatus } from "@/lib/library/list";

/** Public share-route base per internal type (null = no public route yet). */
function sharePathFor(internal: LibraryInternal): string | null {
  if (internal === "notebook") return "/p";
  if (internal === "saved_prompt") return "/s/p";
  return null; // user_template: visibility settable; public route is a follow-up
}

export function LibraryControls({
  internal,
  id,
  status,
  shareSlug,
}: {
  internal: LibraryInternal;
  id: string;
  status: LibraryStatus;
  shareSlug: string | null;
}) {
  const [state, action] = useActionState(setVisibilityAction, {} as VisibilityState);
  const formRef = useRef<HTMLFormElement>(null);
  const [copied, setCopied] = useState(false);

  const base = sharePathFor(internal);
  const url =
    shareSlug && base && typeof window !== "undefined"
      ? `${window.location.origin}${base}/${shareSlug}`
      : "";

  return (
    <div className="lib-controls">
      <form ref={formRef} action={action}>
        <input type="hidden" name="internal" value={internal} />
        <input type="hidden" name="id" value={id} />
        <select
          name="visibility"
          defaultValue={status}
          aria-label="Visibility"
          className="select lib-vis"
          onChange={() => formRef.current?.requestSubmit()}
        >
          <option value="draft">Draft</option>
          <option value="unlisted">Unlisted</option>
          <option value="published">Published</option>
        </select>
      </form>

      {url && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            void navigator.clipboard?.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      )}
      {state.error && <span className="lib-err">{state.error}</span>}
    </div>
  );
}

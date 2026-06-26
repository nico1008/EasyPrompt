"use client";

/* Sharing UI for the My Library detail panel. Binary model: an item is Private
 * (default, unnamed) or Published. Publishing is a deliberate act — it lists the
 * item in the public community catalog + the author's profile and gives it an
 * indexable page — so it gets its own multi-step flow (PublishFlow), not a toggle.
 *
 * Backend is single-sourced: both pieces drive setVisibilityAction
 * (lib/library/actions.ts). Publish → visibility='published' (mints the persistent
 * share_slug, freezes the prompt body, enforces the category/content gate);
 * Unpublish → 'draft' (slug persists but the public RPCs stop serving it). The UI
 * never emits 'unlisted'. */

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import { ConfirmButton } from "@/components/ConfirmButton";
import { setVisibilityAction, type VisibilityState } from "@/lib/library/actions";
import { CATEGORIES } from "@/data/templates";
import type { LibraryInternal, LibraryObjectType, LibraryStatus } from "@/lib/library/list";

/** Canonical public page for a published item (Copy link / View public page).
 *  Prompts list at /prompts/{slug}; Templates (form + notebook) at /p/{slug}. */
export function publicUrlFor(internal: LibraryInternal, slug: string | null): string {
  if (!slug || typeof window === "undefined") return "";
  const base = internal === "saved_prompt" ? "/prompts" : "/p";
  return `${window.location.origin}${base}/${slug}`;
}

function CopyLink({ url, primary = false }: { url: string; primary?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={primary ? "btn btn-primary btn-block" : "btn btn-ghost btn-sm"}
      onClick={() => {
        void navigator.clipboard?.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={primary ? 15 : 14} />
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

/* ── Overview sharing area: Private CTA, or Published management ───────────── */

export function SharingSection({
  internal,
  id,
  status,
  shareSlug,
  category,
  onStartPublish,
}: {
  internal: LibraryInternal;
  id: string;
  status: LibraryStatus;
  shareSlug: string | null;
  category?: string | null;
  onStartPublish: () => void;
}) {
  const [state, action] = useActionState(setVisibilityAction, {} as VisibilityState);
  const published = status === "published";

  if (!published) {
    return (
      <div className="lib-share">
        <div className="lib-share-state">
          <span className="lib-dot" aria-hidden="true" />
          <span className="lib-share-name">Private</span>
          <em>Only you can see this.</em>
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={onStartPublish}>
          <Icon name="share" size={15} /> Publish…
        </button>
      </div>
    );
  }

  const url = publicUrlFor(internal, shareSlug);
  return (
    <div className="lib-share is-published">
      <div className="lib-share-state on">
        <span className="lib-dot" aria-hidden="true" />
        <span className="lib-share-name">Published</span>
        <em>Anyone with the link can open this.</em>
      </div>

      {url && (
        <>
          <code className="lib-link-url" title={url}>
            {url}
          </code>
          <CopyLink url={url} primary />
        </>
      )}

      <div className="lib-share-secondary">
        {url && (
          <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">
            <Icon name="arrow-right" size={14} /> View public page
          </a>
        )}
        <form action={action}>
          <input type="hidden" name="internal" value={internal} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="visibility" value="published" />
          {category != null && <input type="hidden" name="category" value={category} />}
          <button type="submit" className="btn btn-ghost btn-sm">
            <Icon name="zap" size={14} /> Update public copy
          </button>
        </form>
        <form action={action} className="lib-unpublish">
          <input type="hidden" name="internal" value={internal} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="visibility" value="draft" />
          <ConfirmButton label="Unpublish" confirmLabel="Confirm unpublish" />
        </form>
      </div>
      {state.error && <p className="lib-err">{state.error}</p>}
    </div>
  );
}

/* ── Publish flow: a deliberate takeover of the panel body ─────────────────── */

function PublishSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      <Icon name="megaphone" size={15} /> {pending ? "Publishing…" : "Publish to community"}
    </button>
  );
}

export function PublishFlow({
  internal,
  objectType,
  id,
  title,
  shareSlug,
  category,
  onClose,
}: {
  internal: LibraryInternal;
  objectType: LibraryObjectType;
  id: string;
  title: string;
  shareSlug: string | null;
  category?: string | null;
  onClose: () => void;
}) {
  const [state, action] = useActionState(setVisibilityAction, {} as VisibilityState);
  const [cat, setCat] = useState(category ?? "");
  const isPrompt = internal === "saved_prompt";
  const where = isPrompt ? "/prompts" : "/p";

  // Success: the server action revalidated /my, so the parent's item prop now
  // carries the freshly-minted share_slug — read the live link from it.
  if (state.ok) {
    const url = publicUrlFor(internal, shareSlug);
    return (
      <div className="lib-pub" role="group" aria-label="Published">
        <div className="lib-pub-success">
          <span className="lib-pub-check">
            <Icon name="check" size={22} />
          </span>
          <h3>Published to the community</h3>
          <p>Anyone can open it, and it’s now listed publicly.</p>
        </div>
        {url ? (
          <div className="lib-link-row">
            <code className="lib-link-url" title={url}>
              {url}
            </code>
            <CopyLink url={url} />
          </div>
        ) : (
          <p className="lib-pub-finalizing">Finalizing the public link…</p>
        )}
        <div className="lib-pub-foot">
          {url && (
            <a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">
              <Icon name="arrow-right" size={15} /> View public page
            </a>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lib-pub" role="group" aria-label="Publish to the community">
      <div className="lib-pub-head">
        <button type="button" className="lib-pub-back" onClick={onClose} aria-label="Back">
          <Icon name="chevron" size={16} />
        </button>
        <h3>Publish to the community</h3>
      </div>

      <p className="lib-pub-explain">
        This {objectType} will be listed publicly under <code>{where}</code> and on your profile,
        with an indexable page anyone can open. You can unpublish anytime.
      </p>

      <div className="lib-pub-what">
        <span className="lib-pub-what-label">Publishing</span>
        <span className="lib-pub-what-title" title={title}>
          {title}
        </span>
      </div>

      <form action={action} className="lib-pub-form">
        <input type="hidden" name="internal" value={internal} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="visibility" value="published" />

        {isPrompt && (
          <label className="lib-cat-field">
            <span>
              Category <em>(required)</em>
            </span>
            <select
              name="category"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              aria-label="Category (required to publish)"
              className={`select${cat ? "" : " is-empty"}`}
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

        {state.error && <p className="lib-err">{state.error}</p>}

        <div className="lib-pub-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <PublishSubmit />
        </div>
      </form>
    </div>
  );
}

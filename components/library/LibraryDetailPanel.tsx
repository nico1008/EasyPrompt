"use client";

/* My Library detail / management surface. A card click opens this — every item
 * action lives HERE, never on the card face: Open/Use, Edit, Sharing (Publish),
 * Duplicate, and Delete. Responsive by CSS: a right slide-in panel on desktop, a
 * full-width sheet on small screens. The duplicate/delete server actions revalidate
 * /my, so the grid + props refresh and the parent auto-closes this surface when the
 * item disappears.
 *
 * Two modes: `overview` (default) and `publish` — a deliberate flow that takes over
 * the panel body. Publishing is consequential (it lists the item publicly), so it's
 * never an inline toggle. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SharingSection, PublishFlow } from "@/components/library/LibraryControls";
import { objectMeta } from "@/lib/library/objectMeta";
import type { LibraryInternal, LibraryItem } from "@/lib/library/list";
import { deleteNotebookAction, duplicateNotebookAction } from "@/lib/notebooks/actions";
import { deleteUserTemplateAction, duplicateUserTemplateAction } from "@/lib/userTemplates/actions";
import { deleteSavedPromptAction, duplicateSavedPromptAction } from "@/lib/savedPrompts/actions";

type FormAction = (formData: FormData) => void | Promise<void>;
const DUP: Record<LibraryInternal, FormAction> = {
  notebook: duplicateNotebookAction,
  user_template: duplicateUserTemplateAction,
  saved_prompt: duplicateSavedPromptAction,
};
const DEL: Record<LibraryInternal, FormAction> = {
  notebook: deleteNotebookAction,
  user_template: deleteUserTemplateAction,
  saved_prompt: deleteSavedPromptAction,
};

export function LibraryDetailPanel({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const meta = objectMeta(item.objectType);
  const [mode, setMode] = useState<"overview" | "publish">("overview");
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Close on ESC (or step back out of publish); trap initial focus; restore on unmount.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (modeRef.current === "publish") setMode("overview");
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="lib-drawer-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className={`lib-drawer is-${item.objectType}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${meta.label}: ${item.title}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lib-drawer-top">
          <span className={`my-type my-type-${item.objectType}`}>
            <Icon name={meta.icon} size={11} />
            {meta.label}
          </span>
          <button type="button" className="lib-drawer-x" aria-label="Close" onClick={onClose}>
            <Icon name="minus" size={16} />
          </button>
        </div>

        {mode === "publish" ? (
          <div className="lib-drawer-body">
            <PublishFlow
              internal={item.internal}
              objectType={item.objectType}
              id={item.id}
              title={item.title}
              shareSlug={item.shareSlug}
              category={item.category}
              onClose={() => setMode("overview")}
            />
          </div>
        ) : (
          <div className="lib-drawer-body">
            <header className="lib-drawer-head">
              <h2 title={item.title}>{item.title}</h2>
              <p className="lib-drawer-meta">{item.meta}</p>
              {item.source && (
                <p className="lib-drawer-source">
                  Created from <Link href={item.source.href}>{item.source.label}</Link>
                </p>
              )}
            </header>

            <div className="lib-drawer-primary">
              <Link className="btn btn-primary" href={item.primaryHref}>
                <Icon name="arrow-right" size={15} /> {item.primaryLabel}
              </Link>
              {item.editHref && (
                <Link className="btn btn-ghost" href={item.editHref}>
                  <Icon name="list" size={15} /> Edit
                </Link>
              )}
            </div>

            <SharingSection
              internal={item.internal}
              id={item.id}
              status={item.status}
              shareSlug={item.shareSlug}
              category={item.category}
              onStartPublish={() => setMode("publish")}
            />

            <div className="lib-drawer-manage">
              <form action={DUP[item.internal]}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className="btn btn-ghost btn-sm">
                  <Icon name="copy" size={14} /> Duplicate
                </button>
              </form>
              <form action={DEL[item.internal]}>
                <input type="hidden" name="id" value={item.id} />
                <ConfirmButton />
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

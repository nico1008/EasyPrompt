"use client";

/* My Library detail / management surface — a card click opens this asset inspector.
 * Every item action lives HERE, never on the card face. Responsive by CSS: a right
 * slide-in panel on desktop, a full-width sheet on small screens. Duplicate/delete
 * server actions revalidate /my, so the grid + props refresh and the parent
 * auto-closes this surface when the item disappears.
 *
 * Hierarchy: asset header (icon + hero title + properties + preview) ->
 * Open (secondary) -> Visibility -> Management. */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ConfirmButton } from "@/components/ConfirmButton";
import { VisibilitySection } from "@/components/library/LibraryControls";
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

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="lib-prop">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function LibraryDetailPanel({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const meta = objectMeta(item.objectType);

  // Close on ESC; trap initial focus; restore on unmount.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
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
            <Icon name="plus" size={16} className="lib-x-glyph" />
          </button>
        </div>

        <div className="lib-drawer-body">
          <header className="lib-asset">
            <span className="lib-asset-icon" aria-hidden="true">
              <Icon name={item.icon} size={22} />
            </span>
            <h2 className="lib-asset-title" title={item.title}>
              {item.title}
            </h2>

              <dl className="lib-props">
                <Prop label="Last edited">{item.updatedLabel}</Prop>
                {item.categoryLabel && <Prop label="Category">{item.categoryLabel}</Prop>}
                {item.sizeLabel && <Prop label="Size">{item.sizeLabel}</Prop>}
                {item.source && (
                  <Prop label="Created from">
                    <Link href={item.source.href}>{item.source.label}</Link>
                  </Prop>
                )}
              </dl>

              {item.preview && (
                <div className="lib-preview">
                  <span className="lib-preview-label">Preview</span>
                  <p className="lib-preview-text">{item.preview}</p>
                </div>
              )}
            </header>

            <div className="lib-open-row">
              <Link className="btn btn-ghost lib-open" href={item.primaryHref}>
                <Icon name="arrow-right" size={15} /> {item.primaryLabel}
              </Link>
              {item.editHref && (
                <Link className="btn btn-ghost" href={item.editHref}>
                  <Icon name="list" size={15} /> Edit
                </Link>
              )}
            </div>

            <section className="lib-group">
              <span className="lib-group-label">Visibility</span>
              <VisibilitySection
                internal={item.internal}
                id={item.id}
                visibility={item.visibility}
                shareSlug={item.shareSlug}
                category={item.category}
              />
            </section>

            <section className="lib-group lib-group-manage">
              <span className="lib-group-label">Management</span>
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
            </section>
        </div>
      </div>
    </div>
  );
}

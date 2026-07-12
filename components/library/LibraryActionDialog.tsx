"use client";

/* My Library item actions. The main card opens the item page; this compact dialog
 * holds secondary management: open/edit, visibility/share, duplicate, and delete. */

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ConfirmButton } from "@/components/ConfirmButton";
import { VisibilitySection } from "@/components/library/LibraryControls";
import { objectMeta } from "@/lib/library/objectMeta";
import type { LibraryInternal, LibraryItem } from "@/lib/library/list";
import { deleteNotebookAction, duplicateNotebookAction } from "@/lib/notebooks/actions";
import { deleteUserTemplateAction, duplicateUserTemplateAction } from "@/lib/userTemplates/actions";
import { deleteSavedPromptAction, duplicateSavedPromptAction } from "@/lib/savedPrompts/actions";
import { deleteWorkflowAction, duplicateWorkflowAction, setWorkflowPublishedAction } from "@/lib/userWorkflows/actions";

type FormAction = (formData: FormData) => void | Promise<void>;
const DUP: Record<LibraryInternal, FormAction> = {
  notebook: duplicateNotebookAction,
  user_template: duplicateUserTemplateAction,
  saved_prompt: duplicateSavedPromptAction,
  user_workflow: duplicateWorkflowAction,
};
const DEL: Record<LibraryInternal, FormAction> = {
  notebook: deleteNotebookAction,
  user_template: deleteUserTemplateAction,
  saved_prompt: deleteSavedPromptAction,
  user_workflow: deleteWorkflowAction,
};

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="lib-prop">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const dialog = event.currentTarget;
  const focusable = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        '[tabindex]:not([tabindex="-1"])',
      ].join(",")
    )
  );

  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function LibraryActionDialog({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const meta = objectMeta(item.objectType);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialog) return;

    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => closeRef.current?.focus());

    return () => {
      previous?.focus?.();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`lib-action-dialog is-${item.objectType}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onKeyDown={trapFocus}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="lib-dialog-inner">
        <div className="lib-dialog-top">
          <span className={`my-type my-type-${item.objectType}`}>
            <Icon name={meta.icon} size={11} />
            {meta.label}
          </span>
          <button
            ref={closeRef}
            type="button"
            className="lib-dialog-x"
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="lib-dialog-scroll">
          <header className="lib-asset">
            <div className="lib-asset-main">
              <span className="lib-asset-icon" aria-hidden="true">
                <Icon name={item.icon} size={20} />
              </span>
              <div className="lib-asset-copy">
                <span
                  className={`my-visibility ${
                    item.visibility === "public" ? "my-visibility-public" : "my-visibility-private"
                  }`}
                >
                  {item.visibility === "public" ? "Public" : "Private"}
                </span>
                <h2 id={titleId} className="lib-asset-title" title={item.title}>
                  {item.title}
                </h2>
              </div>
            </div>

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

          <section className="lib-group">
            <span className="lib-group-label">Actions</span>
            <div className="lib-open-row">
              <Link className="btn btn-primary lib-open" href={item.primaryHref}>
                <Icon name="arrow-right" size={15} /> {item.primaryLabel}
              </Link>
              {item.editHref && (
                <Link className="btn btn-ghost" href={item.editHref}>
                  <Icon name="list" size={15} /> Edit
                </Link>
              )}
            </div>
          </section>

          <section className="lib-group">
            <span className="lib-group-label">Visibility</span>
            {item.internal === "user_workflow" ? (
              <form action={setWorkflowPublishedAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="revision" value={item.revision ?? 1} />
                <input type="hidden" name="publish" value={item.visibility === "public" ? "false" : "true"} />
                <button className="btn btn-ghost btn-sm">
                  {item.visibility === "public" ? "Make private" : "Publish"}
                </button>
                {item.visibility === "public" && item.shareSlug ? (
                  <Link href={`/w/${item.shareSlug}`}>View public Workflow</Link>
                ) : null}
              </form>
            ) : (
              <VisibilitySection internal={item.internal} id={item.id} visibility={item.visibility} shareSlug={item.shareSlug} category={item.category} />
            )}
          </section>

          <section className="lib-group lib-group-manage">
            <span className="lib-group-label">Management</span>
            <div className="lib-dialog-manage">
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
    </dialog>
  );
}

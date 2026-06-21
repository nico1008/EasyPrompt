"use client";

/* Confirm/picker dialog shown before "Customize" navigates anywhere. The user
 * chooses how to make the prompt their own — open the source Template's form
 * (when the example came from one), edit a copy in the prompt editor, or just
 * copy it. Native <dialog> so it escapes any stacking context, traps focus, and
 * closes on Esc for free; animation is reduced-motion aware (see prompts.css). */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { copyText } from "@/lib/clipboard";
import { trackUse } from "@/lib/metrics/track";
import { getTemplate } from "@/data/templates";
import type { ExamplePrompt } from "@/data/prompts";

export function CustomizeModal({
  prompt,
  open,
  onClose,
  onCopied,
}: {
  prompt: ExamplePrompt;
  open: boolean;
  onClose: () => void;
  onCopied: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  // Drive the native dialog from React state.
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open]);

  const sourceTemplate = prompt.sourceTemplateSlug
    ? getTemplate(prompt.sourceTemplateSlug)
    : undefined;

  return (
    <dialog
      ref={ref}
      className="customize-dialog"
      onClose={onClose}
      onClick={(e) => {
        // Backdrop click (target is the dialog itself, not its content).
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="cd-inner">
        <div className="cd-head">
          <h2>Make it yours</h2>
          <button type="button" className="cd-x" onClick={onClose} aria-label="Close">
            <Icon name="minus" size={16} />
          </button>
        </div>
        <p className="cd-sub">How would you like to customize “{prompt.title}”?</p>

        <div className="cd-options">
          {sourceTemplate && (
            <button
              type="button"
              className="cd-option"
              onClick={() => router.push(`/templates/${sourceTemplate.slug}`)}
            >
              <span className="cd-ic">
                <Icon name="list" size={18} />
              </span>
              <span className="cd-text">
                <strong>Open the {sourceTemplate.tag || "template"} form</strong>
                <span>Answer a few questions and generate your own version.</span>
              </span>
              <Icon name="arrow-right" size={15} />
            </button>
          )}

          <button
            type="button"
            className="cd-option"
            onClick={() => router.push(`/build/prompt?from=${prompt.slug}`)}
          >
            <span className="cd-ic">
              <Icon name="letter" size={18} />
            </span>
            <span className="cd-text">
              <strong>Edit a copy in the editor</strong>
              <span>Open this prompt in the editor and rewrite it freely.</span>
            </span>
            <Icon name="arrow-right" size={15} />
          </button>

          <button
            type="button"
            className="cd-option"
            onClick={async () => {
              if (await copyText(prompt.body)) {
                trackUse({ kind: "example_prompt", key: prompt.slug }, "copy");
                onCopied();
              }
              onClose();
            }}
          >
            <span className="cd-ic">
              <Icon name="copy" size={18} />
            </span>
            <span className="cd-text">
              <strong>Just copy it</strong>
              <span>Put the prompt on your clipboard as-is.</span>
            </span>
          </button>
        </div>
      </div>
    </dialog>
  );
}

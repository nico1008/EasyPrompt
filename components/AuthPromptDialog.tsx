"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { Icon, type IconName } from "./Icon";

function withNext(path: "/login" | "/signup", next: string): string {
  return `${path}?next=${encodeURIComponent(next)}`;
}

export function AuthPromptDialog({
  open,
  next,
  onClose,
  title = "Create an account",
  body = "Create a free account to keep your work and return anytime.",
  icon = "user",
  signupLabel = "Create account",
  loginLabel = "Log in",
  dismissLabel = "Continue",
  onBeforeAuthNavigate,
}: {
  open: boolean;
  next: string;
  onClose: () => void;
  title?: string;
  body?: string;
  icon?: IconName;
  signupLabel?: string;
  loginLabel?: string;
  dismissLabel?: string;
  onBeforeAuthNavigate?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="auth-prompt-dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="apd-inner">
        <div className="apd-head">
          <span className="apd-mark" aria-hidden="true">
            <Icon name={icon} size={18} />
          </span>
          <button type="button" className="apd-close" onClick={onClose} aria-label="Close">
            <Icon name="plus" size={17} className="apd-x-glyph" />
          </button>
        </div>
        <div className="apd-copy">
          <h2 id={titleId}>{title}</h2>
          <p id={bodyId}>{body}</p>
        </div>
        <div className="apd-actions">
          <Link
            className="btn btn-primary btn-sm"
            href={withNext("/signup", next)}
            onClick={onBeforeAuthNavigate}
          >
            {signupLabel}
          </Link>
          <Link
            className="btn btn-ghost btn-sm"
            href={withNext("/login", next)}
            onClick={onBeforeAuthNavigate}
          >
            {loginLabel}
          </Link>
          <button type="button" className="apd-tertiary" onClick={onClose}>
            {dismissLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "./Icon";

function withNext(path: "/login" | "/signup", next: string): string {
  return `${path}?next=${encodeURIComponent(next)}`;
}

export function AuthPromptDialog({
  open,
  next,
  onClose,
  title = "Keep this in My Library",
  body = "Create a free account to save Templates and Prompts across devices.",
  icon = "bookmark",
  signupLabel = "Create account",
  loginLabel = "Log in",
  dismissLabel = "Keep browsing",
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
            <Icon name="minus" size={16} />
          </button>
        </div>
        <div className="apd-copy">
          <h2>{title}</h2>
          <p>{body}</p>
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

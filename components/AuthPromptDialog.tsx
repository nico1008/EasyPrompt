"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { Icon } from "./Icon";

function withNext(path: "/login" | "/signup", next: string): string {
  return `${path}?next=${encodeURIComponent(next)}`;
}

export function AuthPromptDialog({
  open,
  next,
  onClose,
  title = "Create an account",
  body = "Create an account to save your work.",
  signupLabel = "Sign up",
  loginLabel = "Log in",
  onBeforeAuthNavigate,
}: {
  open: boolean;
  next: string;
  onClose: () => void;
  title?: string;
  body?: string;
  signupLabel?: string;
  loginLabel?: string;
  onBeforeAuthNavigate?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const dialog = ref.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  return (
    <dialog
      ref={ref}
      className="auth-prompt-dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={onClose}
      onKeyDown={trapFocus}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="apd-inner">
        <div className="apd-head">
          <button type="button" className="apd-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="apd-copy">
          <h2 id={titleId}>{title}</h2>
          <p id={bodyId}>{body}</p>
        </div>
        <div className="apd-actions">
          <Link
            className="btn btn-primary apd-primary"
            href={withNext("/signup", next)}
            onClick={onBeforeAuthNavigate}
          >
            {signupLabel}
          </Link>
          <Link
            className="btn btn-ghost apd-secondary"
            href={withNext("/login", next)}
            onClick={onBeforeAuthNavigate}
          >
            {loginLabel}
          </Link>
        </div>
      </div>
    </dialog>
  );
}

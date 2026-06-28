"use client";

/* Signed-in nav control: an avatar button that opens a grouped account menu.
 * Log out posts to the signOutAction server action. Closes on outside-click and
 * Escape. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { signOutAction } from "@/lib/auth/actions";
import "./UserMenu.css";

export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const initial = (email.trim()[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      // Esc closes the menu and returns focus to the trigger (avoids dropping the
      // keyboard user at the top of the tab order).
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        className="user-avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
      >
        {initial}
      </button>

      {open && (
        <div className="user-pop" role="menu" aria-label="Account menu">
          <div className="user-pop-head">
            <span className="user-pop-avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="user-pop-id">
              <strong>Signed in as</strong>
              <span title={email}>{email}</span>
            </div>
          </div>

          <Link
            className="user-account-link"
            role="menuitem"
            href="/account"
            onClick={() => setOpen(false)}
          >
            <Icon name="user" size={14} />
            Your account
          </Link>

          <div className="user-pop-group">
            <Link role="menuitem" href="/my?filter=prompts" onClick={() => setOpen(false)}>
              My prompts
            </Link>
            <Link role="menuitem" href="/my" onClick={() => setOpen(false)}>
              My library
            </Link>
          </div>

          <div className="user-pop-group">
            <Link role="menuitem" href="/build/prompt" onClick={() => setOpen(false)}>
              New prompt
            </Link>
            <Link role="menuitem" href="/build/template" onClick={() => setOpen(false)}>
              New template
            </Link>
          </div>

          <form action={signOutAction} className="user-pop-logout">
            <button type="submit" role="menuitem">
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

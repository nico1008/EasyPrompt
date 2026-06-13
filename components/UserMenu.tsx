"use client";

/* Signed-in nav control: an avatar button that opens a small menu with links to
 * the dashboard + settings and a Log out form (posts to the signOutAction server
 * action). Closes on outside-click and Escape. */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/lib/auth/actions";
import "./UserMenu.css";

export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (email.trim()[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
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
        <div className="user-pop" role="menu">
          <div className="user-pop-email" title={email}>
            {email}
          </div>
          <Link role="menuitem" href="/my" onClick={() => setOpen(false)}>
            My prompts
          </Link>
          <Link role="menuitem" href="/my/templates/new" onClick={() => setOpen(false)}>
            New template
          </Link>
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)}>
            Account settings
          </Link>
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

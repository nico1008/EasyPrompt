"use client";

/* Signed-in nav control: an avatar button that opens the account menu.
 * Log out posts to the signOutAction server action. Closes on outside-click and
 * Escape. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Library, LogOut, Settings, User, Zap } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import "./UserMenu.css";

export function UserMenu({
  username,
  displayName,
}: {
  username: string;
  displayName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const nickname = displayName?.trim() || username;
  const initial = (nickname.trim()[0] ?? "").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      // Esc closes the menu and returns focus to the trigger.
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
              <strong>{nickname}</strong>
            </div>
          </div>

          <div className="user-pop-group">
            <Link role="menuitem" href={`/${username}`} onClick={() => setOpen(false)}>
              <User size={16} strokeWidth={1.9} />
              <span>Profile</span>
            </Link>
            <Link role="menuitem" href="/my" onClick={() => setOpen(false)}>
              <Library size={16} strokeWidth={1.9} />
              <span>My library</span>
            </Link>
            <Link role="menuitem" href="/account" onClick={() => setOpen(false)}>
              <Settings size={16} strokeWidth={1.9} />
              <span>Settings</span>
            </Link>
            <Link role="menuitem" href="/account#pro" onClick={() => setOpen(false)}>
              <Zap size={16} strokeWidth={1.9} />
              <span>Pro</span>
            </Link>
          </div>

          <form action={signOutAction} className="user-pop-logout">
            <button type="submit" role="menuitem">
              <LogOut size={16} strokeWidth={1.9} />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

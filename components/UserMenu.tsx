"use client";

/* Signed-in nav control: an avatar button that opens the account menu.
 * Log out posts to the signOutAction server action. Closes on outside-click and
 * Escape. */

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Library, LogOut, Settings, User, Zap } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import "./UserMenu.css";

function SignOutSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="user-pop-confirm-submit" disabled={pending}>
      {pending ? "Signing out..." : "Yes, sign out"}
    </button>
  );
}

export function UserMenu({
  username,
}: {
  username: string;
}) {
  const [open, setOpen] = useState(false);
  const [signOutArmed, setSignOutArmed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const initial = (username.trim()[0] ?? "").toUpperCase();

  useEffect(() => {
    if (!open) setSignOutArmed(false);
  }, [open]);

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
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
      >
        {initial}
      </button>

      {open && (
        <div className="user-pop" aria-label="Account menu">
          <div className="user-pop-head">
            <span className="user-pop-avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="user-pop-id">
              <strong>@{username}</strong>
            </div>
          </div>

          <div className="user-pop-group">
            <Link href={`/${username}`} onClick={() => setOpen(false)}>
              <User size={16} strokeWidth={1.9} />
              <span>Profile</span>
            </Link>
            <Link href="/my" onClick={() => setOpen(false)}>
              <Library size={16} strokeWidth={1.9} />
              <span>My library</span>
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)}>
              <Settings size={16} strokeWidth={1.9} />
              <span>Settings</span>
            </Link>
            <Link href="/settings#pro" onClick={() => setOpen(false)}>
              <Zap size={16} strokeWidth={1.9} />
              <span>Pro</span>
            </Link>
          </div>

          <form action={signOutAction} className="user-pop-logout">
            {signOutArmed ? (
              <div className="user-pop-confirm" role="group" aria-label="Confirm sign out">
                <span>Sign out of this device?</span>
                <div className="user-pop-confirm-actions">
                  <SignOutSubmit />
                  <button type="button" onClick={() => setSignOutArmed(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="user-pop-signout"
                onClick={() => setSignOutArmed(true)}
              >
                <LogOut size={16} strokeWidth={1.9} />
                <span>Sign out</span>
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

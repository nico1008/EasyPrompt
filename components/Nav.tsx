"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { UserMenu } from "./UserMenu";
import { config } from "@/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseAccountState } from "@/lib/supabase/useUser";
import { useEscape } from "@/lib/useEscape";

// Core content-model nav. Marketing links (Home / How it works / Pricing) live in
// the footer; Home is reachable via the brand logo.
const BASE_LINKS = [
  { href: "/templates", label: "Templates" },
  { href: "/prompts", label: "Prompts" },
  { href: "/build", label: "Builder" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Esc closes the open mobile menu and returns focus to the burger (the app-wide
  // Esc convention — see lib/useEscape).
  useEscape(open, () => {
    setOpen(false);
    burgerRef.current?.focus();
  });

  // Auth state is resolved after mount through /api/account-state, so the shared
  // layout stays free of cookies() and the marketing/catalog pages stay static.
  const accountsOn = config.accounts.enabled && isSupabaseConfigured();
  const { account, authLikely, loaded } = useSupabaseAccountState();
  const username = account?.profile.username;
  const avatarLabel =
    account?.profile.displayName?.trim() || username || account?.email?.trim()[0]?.toUpperCase() || "";
  const avatarInitial = (avatarLabel.trim()[0] ?? "").toUpperCase();
  const showAccountChrome = accountsOn && (Boolean(account) || authLikely);

  const links =
    showAccountChrome
      ? [...BASE_LINKS, { href: "/my", label: "My Library" }]
      : BASE_LINKS;

  return (
    <nav className="nav">
      <Link className="brand" href="/">
        <span className="glyph-pixel" aria-hidden="true" /> EasyPrompt
      </Link>

      <div className={`links nav-links${open ? " open" : ""}`}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={isActive(pathname, l.href) ? "on" : undefined}
            onClick={() => setOpen(false)}
            aria-current={isActive(pathname, l.href) ? "page" : undefined}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="right">
        {accountsOn && account && username ? (
          <UserMenu username={username} displayName={account.profile.displayName} />
        ) : showAccountChrome && (!loaded || !account) ? (
          <button className="user-avatar is-loading" type="button" aria-label="Loading account" disabled>
            {avatarInitial || "?"}
          </button>
        ) : showAccountChrome ? (
          <Link className="user-avatar" href="/account#profile" aria-label="Complete profile">
            {avatarInitial || "?"}
          </Link>
        ) : accountsOn ? (
          <>
            <Link className="nav-login" href="/login">
              Log in
            </Link>
            <Link className="btn btn-primary btn-sm" href="/signup">
              Sign up
            </Link>
          </>
        ) : (
          <Link className="btn btn-primary btn-sm" href="/templates">
            Get started
          </Link>
        )}
        <button
          ref={burgerRef}
          className="nav-burger"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

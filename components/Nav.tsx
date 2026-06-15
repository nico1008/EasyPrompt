"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserMenu } from "./UserMenu";
import { config } from "@/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseUser } from "@/lib/supabase/useUser";

const BASE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/prompts", label: "Prompts" },
  { href: "/build", label: "Builder" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  // Auth state is resolved client-side (see useSupabaseUser) so the shared
  // layout stays free of cookies() and the marketing/catalog pages stay static.
  const accountsOn = config.accounts.enabled && isSupabaseConfigured();
  const userEmail = useSupabaseUser();

  const links =
    accountsOn && userEmail
      ? [...BASE_LINKS, { href: "/my", label: "My prompts" }]
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
        {accountsOn && userEmail ? (
          <UserMenu email={userEmail} />
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
          <Link className="btn btn-primary btn-sm" href="/prompts">
            Get started
          </Link>
        )}
        <button
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

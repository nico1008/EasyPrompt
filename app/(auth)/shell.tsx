/* Shared chrome for the auth pages (server component). Importing auth.css here
 * pulls it in wherever the shell is used. CSS is global in the App Router, so
 * every rule in auth.css is scoped under `.auth-page` (see CLAUDE.md gotcha). */

import Link from "next/link";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/Eyebrow";
import { CrosshairCard } from "@/components/CrosshairCard";
import "./auth.css";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <CrosshairCard className="panel auth-card">
        <div className="auth-head">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </CrosshairCard>
    </main>
  );
}

/** Shown on auth routes when Supabase env isn't set, so the pages never crash. */
export function NotConfigured() {
  return (
    <main className="auth-page">
      <CrosshairCard className="panel auth-card">
        <div className="auth-head">
          <Eyebrow>Heads up</Eyebrow>
          <h1>Accounts coming soon</h1>
          <p className="auth-notice">
            This deployment doesn&apos;t have accounts configured yet. The prompt
            builder works without one — <Link href="/templates">browse prompts →</Link>
          </p>
        </div>
      </CrosshairCard>
    </main>
  );
}

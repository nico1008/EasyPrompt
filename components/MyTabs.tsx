"use client";

/* Tab bar for the account hub. Each tab is a real route (so its data is
 * server-rendered, RLS-scoped); this just highlights the active one. Rendered at
 * the top of each list page, not in a layout, so editor sub-pages aren't wrapped. */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/my", label: "Built" },
  { href: "/my/saved", label: "Saved" },
  { href: "/my/templates", label: "Templates" },
  { href: "/my/library", label: "Library" },
];

export function MyTabs() {
  const path = usePathname() || "/my";
  return (
    <div className="my-tabs" role="tablist" aria-label="Your workspace">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            className={`my-tab${active ? " on" : ""}`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

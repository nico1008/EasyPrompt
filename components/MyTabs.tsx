"use client";

/* Filter bar for the unified My Library. Each filter is a `?filter=` query on
 * /my (one server-rendered, RLS-scoped list); this just highlights the active
 * one. Object-type filters only; visibility is managed per item. */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PRIMARY_FILTERS } from "@/lib/library/list";

export function MyTabs() {
  const sp = useSearchParams();
  const active = sp.get("filter") ?? "all";
  return (
    <nav className="my-tabs" aria-label="Library filters">
      {PRIMARY_FILTERS.map((f) => {
        const on = active === f.id;
        const href = f.id === "all" ? "/my" : `/my?filter=${f.id}`;
        return (
          <Link
            key={f.id}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`my-tab${on ? " on" : ""}`}
          >
            {f.label}
          </Link>
        );
      })}
    </nav>
  );
}

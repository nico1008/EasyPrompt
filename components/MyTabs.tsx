"use client";

/* Filter bar for the unified My Library. Each filter is a `?filter=` query on
 * /my (one server-rendered, RLS-scoped list); this just highlights the active
 * one. Object-type + status filters, never the internal storage concepts. */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LIBRARY_FILTERS } from "@/lib/library/list";

export function MyTabs() {
  const sp = useSearchParams();
  const active = sp.get("filter") ?? "all";
  return (
    <div className="my-tabs" role="tablist" aria-label="Library filters">
      {LIBRARY_FILTERS.map((f) => {
        const on = active === f.id;
        const href = f.id === "all" ? "/my" : `/my?filter=${f.id}`;
        return (
          <Link
            key={f.id}
            href={href}
            role="tab"
            aria-selected={on}
            className={`my-tab${on ? " on" : ""}`}
          >
            {f.label}
          </Link>
        );
      })}
    </div>
  );
}

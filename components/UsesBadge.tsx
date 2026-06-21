"use client";

/* Compact "Uses" count (copies + open-ins) for cards and detail pages. Mirrors
 * RatingStars: hydrates client-side off the security-definer RPC so SSG pages stay
 * static, and renders nothing when accounts are off.
 *
 * Anti-CLS: when Supabase is on it ALWAYS renders a min-width-reserved slot (a
 * skeleton while loading, the number when > 0, an empty-but-reserved slot at 0) so
 * the grid never reflows as counts arrive. Pass `managed` + `count` from a grid
 * that batch-fetches; omit both to self-hydrate (detail pages). */

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchCounts } from "@/lib/metrics/client";
import { compactNumber } from "@/lib/metrics/format";
import type { MetricTarget } from "@/lib/metrics/schema";

export function UsesBadge({
  target,
  count,
  managed = false,
}: {
  target: MetricTarget;
  /** Grid-distributed count (with `managed`). Undefined = still loading. */
  count?: number;
  /** When true, never self-fetch — the count is supplied by a parent grid. */
  managed?: boolean;
}) {
  const [uses, setUses] = useState<number | null>(
    typeof count === "number" ? count : null
  );

  useEffect(() => {
    if (managed) {
      setUses(typeof count === "number" ? count : null);
      return;
    }
    if (!isSupabaseConfigured()) return;
    let active = true;
    void fetchCounts(target).then((c) => {
      if (active) setUses(c.uses);
    });
    return () => {
      active = false;
    };
  }, [managed, count, target.kind, target.key]);

  if (!isSupabaseConfigured()) return null;

  const loading = uses === null;
  return (
    <span
      className={`uses-badge${loading ? " uses-badge--loading" : ""}`}
      aria-hidden={loading || uses === 0 ? true : undefined}
      aria-label={!loading && uses > 0 ? `${uses} uses` : undefined}
      title={!loading && uses > 0 ? `${uses} ${uses === 1 ? "use" : "uses"}` : undefined}
    >
      {!loading && uses > 0 && (
        <>
          <Icon name="zap" size={13} />
          {compactNumber(uses)}
        </>
      )}
    </span>
  );
}

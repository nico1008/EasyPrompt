"use client";

/* Compact "Uses" count (copies + open-ins) for cards and detail pages. Mirrors
 * RatingStars: hydrates client-side off the security-definer RPC so SSG pages stay
 * static, and renders nothing when accounts are off.
 *
 * Contract: `count` is a NUMBER once loaded (0 included) and `undefined` while a
 * parent grid is still batch-loading. The badge renders nothing while loading and
 * nothing at zero — only a real, non-zero count appears (with a small fade-in), so
 * a fresh catalog stays clean instead of showing empty slots or a stuck skeleton.
 * Pass `managed` + `count` from a grid that batch-fetches; omit both to self-hydrate
 * (detail pages). */

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
  /** Grid-distributed count: a number when the batch has loaded (0 allowed),
   *  undefined while still loading. */
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

  // Nothing to show while loading (null) or when there are no uses yet.
  if (!isSupabaseConfigured() || uses === null || uses <= 0) return null;

  return (
    <span className="uses-badge" aria-label={`${uses} uses`} title={`${uses} ${uses === 1 ? "use" : "uses"}`}>
      <Icon name="zap" size={13} />
      {compactNumber(uses)}
    </span>
  );
}

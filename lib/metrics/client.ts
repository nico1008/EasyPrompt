"use client";

/* Client-side usage-count reads, used by UsesBadge on the statically-generated
 * catalog/prompts pages so counts show without making those pages dynamic (same
 * client-hydrate pattern as lib/ratings/client.ts). Reads only — the increment
 * goes through /api/track (server-side, so the IP/identity hashing stays secret).
 *
 * Both use the security-definer RPCs (granted to anon), so they work logged-out,
 * are gated by isSupabaseConfigured(), and fail soft to empty. fetchCountsBatch
 * is one round-trip for a whole card grid (no N+1). */

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { rowToCounts, EMPTY_COUNTS, type Counts } from "./map";
import type { MetricKind, MetricTarget } from "./schema";

export async function fetchCounts(target: MetricTarget): Promise<Counts> {
  if (!isSupabaseConfigured()) return EMPTY_COUNTS;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("content_stats_get", {
      p_kind: target.kind,
      p_key: target.key,
    });
    if (error || !data || !data[0]) return EMPTY_COUNTS;
    return rowToCounts(data[0]);
  } catch {
    return EMPTY_COUNTS;
  }
}

/** Counts for many keys of one kind in a single RPC. Returns a slug → Counts map;
 *  missing keys (no rows yet) are simply absent (callers treat that as zero). */
export async function fetchCountsBatch(
  kind: MetricKind,
  keys: string[]
): Promise<Map<string, Counts>> {
  const out = new Map<string, Counts>();
  if (!isSupabaseConfigured() || keys.length === 0) return out;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("content_stats_batch", {
      p_kind: kind,
      p_keys: keys,
    });
    if (error || !data) return out;
    for (const row of data) out.set(row.target_key, rowToCounts(row));
    return out;
  } catch {
    return out;
  }
}

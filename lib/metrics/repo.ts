import "server-only";

/* Cookie-free public reads for usage counts. These use security-definer RPCs
 * granted to anon, so public catalog pages can preload social proof without
 * reading a signed-in session or making the shared layout dynamic. */

import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { rowToCounts, EMPTY_COUNTS, type Counts, type CountsRecord } from "./map";
import type { MetricKind, MetricTarget } from "./schema";

export async function getPublicCounts(target: MetricTarget): Promise<Counts> {
  if (!isSupabaseConfigured()) return EMPTY_COUNTS;
  try {
    const supabase = createPublicClient();
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

export async function getPublicCountsBatch(
  kind: MetricKind,
  keys: string[]
): Promise<CountsRecord> {
  if (!isSupabaseConfigured() || keys.length === 0) return {};
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("content_stats_batch", {
      p_kind: kind,
      p_keys: keys,
    });
    if (error || !data) return {};
    return Object.fromEntries(data.map((row) => [row.target_key, rowToCounts(row)]));
  } catch {
    return {};
  }
}

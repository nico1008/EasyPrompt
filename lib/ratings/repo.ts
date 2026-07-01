import "server-only";

/* Read helpers for ratings, callable from Server Components / actions. The
 * per-user rating is RLS-scoped (own row only); the aggregate goes through the
 * security-definer rating_aggregate() RPC so it can read across all raters
 * without exposing individual rows. */

import { createClient, createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { rowToAggregate, EMPTY_AGGREGATE, type Aggregate, type AggregateRecord } from "./map";
import type { RatingTarget } from "./schema";

export async function getMyRating(target: RatingTarget): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prompt_ratings")
    .select("rating")
    .eq("target_kind", target.kind)
    .eq("target_key", target.key)
    .maybeSingle();
  return data?.rating ?? null;
}

export async function getAggregate(target: RatingTarget): Promise<Aggregate> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rating_aggregate", {
    p_target_kind: target.kind,
    p_target_key: target.key,
  });
  if (error || !data || !data[0]) return EMPTY_AGGREGATE;
  return rowToAggregate(data[0]);
}

export async function getPublicAggregate(target: RatingTarget): Promise<Aggregate> {
  if (!isSupabaseConfigured()) return EMPTY_AGGREGATE;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("rating_aggregate", {
      p_target_kind: target.kind,
      p_target_key: target.key,
    });
    if (error || !data || !data[0]) return EMPTY_AGGREGATE;
    return rowToAggregate(data[0]);
  } catch {
    return EMPTY_AGGREGATE;
  }
}

export async function getPublicAggregates(
  targets: RatingTarget[]
): Promise<AggregateRecord> {
  const pairs = await Promise.all(
    targets.map(async (target) => [target.key, await getPublicAggregate(target)] as const)
  );
  return Object.fromEntries(pairs);
}

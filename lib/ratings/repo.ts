import "server-only";

/* Read helpers for ratings, callable from Server Components / actions. The
 * per-user rating is RLS-scoped (own row only); the aggregate goes through the
 * security-definer rating_aggregate() RPC so it can read across all raters
 * without exposing individual rows. */

import { createClient } from "@/lib/supabase/server";
import { rowToAggregate, EMPTY_AGGREGATE, type Aggregate } from "./map";
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

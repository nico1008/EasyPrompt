"use client";

/* Client-side rating reads, used by RatingStars on the statically-generated
 * catalog so the aggregate shows without making those pages dynamic (same
 * client-hydrate pattern as useSupabaseUser / the premium client). Reads only —
 * the rating mutation stays in the Zod-validated server action (rateAction).
 *
 * fetchAggregate uses the security-definer RPC (granted to anon), so it works
 * logged-out. fetchMyRating reads the caller's own row via RLS; callers only
 * invoke it when a user is signed in. Both are gated by isSupabaseConfigured()
 * and fail soft to a neutral value. */

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { rowToAggregate, EMPTY_AGGREGATE, type Aggregate } from "./map";
import type { RatingTarget } from "./schema";

export async function fetchAggregate(target: RatingTarget): Promise<Aggregate> {
  if (!isSupabaseConfigured()) return EMPTY_AGGREGATE;
  try {
    const supabase = createClient();
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

export async function fetchMyRating(target: RatingTarget): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("prompt_ratings")
      .select("rating")
      .eq("target_kind", target.kind)
      .eq("target_key", target.key)
      .maybeSingle();
    return data?.rating ?? null;
  } catch {
    return null;
  }
}

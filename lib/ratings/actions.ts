"use server";

/* Submit a 1–5 rating for a target. Authorizes with getUser(); RLS guarantees a
 * user can only ever write their own (owner_id, target) row, and the unique
 * constraint makes the upsert one-per-user. No revalidatePath — the aggregate is
 * read client-side (keeps the SSG catalog static); we return the fresh aggregate
 * so the caller can reflect it immediately. */

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getTemplate } from "@/data/templates";
import { ratingSchema, ratingTargetSchema, type RatingTarget } from "./schema";
import { rowToAggregate, EMPTY_AGGREGATE, type Aggregate } from "./map";

export type RateState = {
  ok?: boolean;
  error?: string;
  aggregate?: Aggregate;
  myRating?: number;
};

export async function rateAction(target: RatingTarget, rating: number): Promise<RateState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };

  const t = ratingTargetSchema.safeParse(target);
  if (!t.success) return { error: "Unknown rating target." };
  const r = ratingSchema.safeParse(rating);
  if (!r.success) return { error: r.error.issues[0].message };

  // Only catalog templates are rateable today (the is_public sharing seam is
  // parked); reject anything that isn't a real catalog slug.
  if (t.data.kind === "catalog" && !getTemplate(t.data.key))
    return { error: "Unknown template." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to rate." };

  const { error } = await supabase.from("prompt_ratings").upsert(
    {
      owner_id: user.id,
      target_kind: t.data.kind,
      target_key: t.data.key,
      rating: r.data,
    },
    { onConflict: "owner_id,target_kind,target_key" }
  );
  if (error) return { error: "Couldn't save your rating." };

  const { data: agg } = await supabase.rpc("rating_aggregate", {
    p_target_kind: t.data.kind,
    p_target_key: t.data.key,
  });
  const aggregate = agg && agg[0] ? rowToAggregate(agg[0]) : EMPTY_AGGREGATE;
  return { ok: true, aggregate, myRating: r.data };
}

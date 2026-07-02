"use client";

/* 1–5 star rating. On the statically-generated catalog this hydrates its
 * aggregate client-side (security-definer RPC, works logged-out) so the page
 * stays static. Submitting goes through the Zod-validated rateAction (login
 * required). `compact` renders a small read-only "★ avg (count)" for cards; the
 * full form is interactive. Gated by isSupabaseConfigured() — renders nothing
 * when accounts are off. */

import { useCallback, useEffect, useState } from "react";
import { AuthPromptDialog } from "@/components/AuthPromptDialog";
import { currentAuthNext } from "@/components/AuthGatedButton";
import { Icon } from "@/components/Icon";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseAccountState } from "@/lib/supabase/useUser";
import { fetchAggregate, fetchMyRating } from "@/lib/ratings/client";
import { rateAction } from "@/lib/ratings/actions";
import type { RatingTarget } from "@/lib/ratings/schema";
import { displayRating, type Aggregate } from "@/lib/ratings/map";

export function RatingStars({
  target,
  compact = false,
  initialAggregate,
}: {
  target: RatingTarget;
  compact?: boolean;
  initialAggregate?: Aggregate;
}) {
  const [agg, setAgg] = useState<Aggregate | null>(initialAggregate ?? null);
  const [mine, setMine] = useState<number | null>(null);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authNext, setAuthNext] = useState("/templates");
  const { account, loaded } = useSupabaseAccountState();
  const loggedIn = Boolean(account);
  const authPending = !loaded;

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;
    void fetchAggregate(target).then((a) => {
      if (active) setAgg(a);
    });
    return () => {
      active = false;
    };
  }, [target.kind, target.key]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !loggedIn) {
      setMine(null);
      return;
    }
    let active = true;
    void fetchMyRating(target).then((r) => {
      if (active) setMine(r);
    });
    return () => {
      active = false;
    };
  }, [loggedIn, target.kind, target.key]);

  const submit = useCallback(
    async (n: number) => {
      if (busy || authPending) return;
      if (!loggedIn) {
        setAuthNext(currentAuthNext("/templates"));
        setAuthPromptOpen(true);
        return;
      }
      setBusy(true);
      setMine(n); // optimistic
      const res = await rateAction(target, n);
      if (res.ok && res.aggregate) {
        setAgg(res.aggregate);
        if (res.myRating) setMine(res.myRating);
      }
      setBusy(false);
    },
    [authPending, loggedIn, busy, target]
  );

  if (!isSupabaseConfigured()) return null;

  if (compact) {
    // Secondary signal: only show once there are enough ratings to be meaningful,
    // and show the Bayesian-shrunk value (so a lone 5★ doesn't read as "5.0").
    const shown = agg ? displayRating(agg) : null;
    if (!agg || shown === null) return null;
    return (
      <span
        className="rating-compact"
        aria-label={`Rated ${shown} out of 5 from ${agg.count} ratings`}
      >
        <Icon name="star" size={13} />
        {shown.toFixed(1)}
        <span className="rating-count">({agg.count})</span>
      </span>
    );
  }

  const headline = agg ? displayRating(agg) : null;

  const display = hover || mine || 0;
  return (
    <div className="rating">
      <div className="rating-stars" aria-label="Rate this Template">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`rating-star${n <= display ? " on" : ""}`}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={mine === n}
            disabled={busy || authPending}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => void submit(n)}
          >
            <Icon name="star" size={22} />
          </button>
        ))}
      </div>
      <div className="rating-meta">
        {agg && headline !== null ? (
          <span>
            {headline.toFixed(1)} from {agg.count} {agg.count === 1 ? "rating" : "ratings"}
          </span>
        ) : agg && agg.count > 0 ? (
          <span>
            {agg.count} {agg.count === 1 ? "rating" : "ratings"} so far
          </span>
        ) : (
          <span>No ratings yet</span>
        )}
        {!loggedIn ? (
          <span className="rating-login">Click a star to rate.</span>
        ) : mine ? (
          <span className="rating-mine">· your rating: {mine}</span>
        ) : null}
      </div>
      <AuthPromptDialog
        open={authPromptOpen}
        next={authNext}
        title="Rate this Template"
        body="Create a free account to save your rating."
        icon="star"
        dismissLabel="Continue without rating"
        onClose={() => setAuthPromptOpen(false)}
      />
    </div>
  );
}

"use client";

/* 1–5 star rating. On the statically-generated catalog this hydrates its
 * aggregate client-side (security-definer RPC, works logged-out) so the page
 * stays static. Submitting goes through the Zod-validated rateAction (login
 * required). `compact` renders a small read-only "★ avg (count)" for cards; the
 * full form is interactive. Gated by isSupabaseConfigured() — renders nothing
 * when accounts are off. */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseUser } from "@/lib/supabase/useUser";
import { fetchAggregate, fetchMyRating } from "@/lib/ratings/client";
import { rateAction } from "@/lib/ratings/actions";
import type { RatingTarget } from "@/lib/ratings/schema";
import { displayRating, type Aggregate } from "@/lib/ratings/map";

export function RatingStars({
  target,
  compact = false,
}: {
  target: RatingTarget;
  compact?: boolean;
}) {
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [mine, setMine] = useState<number | null>(null);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  const email = useSupabaseUser();
  const loggedIn = Boolean(email);

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
      if (!loggedIn || busy) return;
      setBusy(true);
      setMine(n); // optimistic
      const res = await rateAction(target, n);
      if (res.ok && res.aggregate) {
        setAgg(res.aggregate);
        if (res.myRating) setMine(res.myRating);
      }
      setBusy(false);
    },
    [loggedIn, busy, target]
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
      <div className="rating-stars" aria-label="Rate this template">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`rating-star${n <= display ? " on" : ""}`}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={mine === n}
            disabled={!loggedIn || busy}
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
          <Link className="rating-login" href="/login">
            Log in to rate
          </Link>
        ) : mine ? (
          <span className="rating-mine">· your rating: {mine}</span>
        ) : null}
      </div>
    </div>
  );
}

"use client";

/* Bookmark toggle. Hydrates its on/off state client-side (RLS own row) so it
 * works on the static catalog, and toggles through the Zod-validated server
 * action with optimistic UI. Lives inside Link-wrapped cards, so it stops click
 * propagation. Gated by isSupabaseConfigured(); hidden for logged-out users on
 * cards (compact). */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseUser } from "@/lib/supabase/useUser";
import { fetchIsBookmarked } from "@/lib/bookmarks/client";
import { toggleBookmarkAction } from "@/lib/bookmarks/actions";
import type { BookmarkTarget } from "@/lib/bookmarks/schema";

export function BookmarkButton({
  target,
  compact = false,
}: {
  target: BookmarkTarget;
  compact?: boolean;
}) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const email = useSupabaseUser();
  const loggedIn = Boolean(email);

  useEffect(() => {
    if (!isSupabaseConfigured() || !loggedIn) {
      setOn(false);
      return;
    }
    let active = true;
    void fetchIsBookmarked(target).then((b) => {
      if (active) setOn(b);
    });
    return () => {
      active = false;
    };
  }, [loggedIn, target.kind, target.key]);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const prev = on;
    setOn(!prev); // optimistic
    const res = await toggleBookmarkAction(target);
    if (!res.ok) setOn(prev);
    else if (typeof res.bookmarked === "boolean") setOn(res.bookmarked);
    setBusy(false);
  }, [busy, on, target]);

  if (!isSupabaseConfigured()) return null;

  if (!loggedIn) {
    if (compact) return null;
    return (
      <Link className="bookmark-btn" href="/login" aria-label="Log in to save to your library">
        <Icon name="bookmark" size={16} />
        {!compact && "Save"}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`bookmark-btn${on ? " on" : ""}`}
      aria-pressed={on}
      aria-label={on ? "Remove from library" : "Save to library"}
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
    >
      <Icon name="bookmark" size={16} className={on ? "bookmark-on" : undefined} />
      {!compact && (on ? "Saved" : "Save")}
    </button>
  );
}

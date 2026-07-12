"use client";

/* Bookmark toggle. Hydrates its on/off state client-side (RLS own row) so it
 * works on the static catalog, and writes through the Zod-validated server
 * action with optimistic UI. Lives inside Link-wrapped cards, so it stops click
 * propagation. Gated by isSupabaseConfigured(); anonymous users see the same
 * stable button chrome and get an account prompt on click. */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { currentAuthNext } from "@/components/AuthGatedButton";
import { AuthPromptDialog } from "@/components/AuthPromptDialog";
import { Icon } from "@/components/Icon";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseAccountState } from "@/lib/supabase/useUser";
import { fetchIsBookmarked } from "@/lib/bookmarks/client";
import { setBookmarkAction } from "@/lib/bookmarks/actions";
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
  const [bookmarkLoaded, setBookmarkLoaded] = useState(false);
  const [pop, setPop] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authNext, setAuthNext] = useState("/");
  const busyRef = useRef(false);
  const hydrationRef = useRef(0);
  const mutationRef = useRef(0);
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { account, authLikely, loaded } = useSupabaseAccountState();
  const loggedIn = Boolean(account);
  const authPending = authLikely && !loaded;

  useEffect(() => {
    if (!isSupabaseConfigured() || !loggedIn) {
      setOn(false);
      setBookmarkLoaded(true);
      return;
    }
    setBookmarkLoaded(false);
    const hydrationId = hydrationRef.current + 1;
    const mutationAtStart = mutationRef.current;
    hydrationRef.current = hydrationId;
    let active = true;
    void fetchIsBookmarked(target).then((b) => {
      if (
        active &&
        hydrationRef.current === hydrationId &&
        mutationRef.current === mutationAtStart
      ) {
        setOn(b);
        setBookmarkLoaded(true);
      }
    }).catch(() => {
      if (active && hydrationRef.current === hydrationId) setBookmarkLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [loggedIn, target.kind, target.key]);

  const toggle = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const prev = on;
    const next = !prev;
    const mutationId = mutationRef.current + 1;
    mutationRef.current = mutationId;
    setOn(next); // optimistic
    if (next) {
      // Pop the icon only when switching ON.
      setPop(true);
      window.setTimeout(() => setPop(false), 340);
    }
    try {
      const res = await setBookmarkAction(target, next);
      if (!res.ok) {
        if (mutationRef.current === mutationId) setOn(prev);
        return;
      }
      if (typeof res.bookmarked === "boolean" && mutationRef.current === mutationId) {
        setOn(res.bookmarked);
      }
      if (pathname.startsWith("/my")) router.refresh();
    } catch {
      if (mutationRef.current === mutationId) setOn(prev);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [on, pathname, router, target]);

  if (!isSupabaseConfigured()) return null;

  const label = on ? "Remove from favorites" : "Add to favorites";
  const objectLabel = target.kind === "catalog_workflow" || target.kind === "user_workflow"
    ? "Workflow"
    : target.kind === "example_prompt" || target.kind === "user_prompt" ? "Prompt" : "Template";
  const authCopy = {
    title: `Favorite this ${objectLabel}`,
    body: `Create an account to add this ${objectLabel} to Favorites in My Library.`,
  };

  return (
    <>
      <button
        type="button"
        className={`bookmark-btn${on ? " on" : ""}${authPending || !bookmarkLoaded ? " is-pending" : ""}`}
        aria-pressed={on}
        aria-label={label}
        disabled={busy || authPending || !bookmarkLoaded}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!loggedIn) {
            setAuthNext(currentAuthNext(pathname));
            setAuthPromptOpen(true);
            return;
          }
          void toggle();
        }}
      >
        <Icon
          name="bookmark"
          size={16}
          className={`${on ? "bookmark-on" : ""}${pop ? " bookmark-pop" : ""}`.trim() || undefined}
        />
        {!compact && (on ? "Favorited" : "Favorite")}
      </button>
      <AuthPromptDialog
        open={authPromptOpen}
        next={authNext}
        title={authCopy.title}
        body={authCopy.body}
        onClose={() => setAuthPromptOpen(false)}
      />
    </>
  );
}

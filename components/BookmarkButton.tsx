"use client";

/* Bookmark toggle. Hydrates its on/off state client-side (RLS own row) so it
 * works on the static catalog, and toggles through the Zod-validated server
 * action with optimistic UI. Lives inside Link-wrapped cards, so it stops click
 * propagation. Gated by isSupabaseConfigured(); anonymous users see the same
 * stable button chrome and get an account prompt on click. */

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { currentAuthNext } from "@/components/AuthGatedButton";
import { AuthPromptDialog } from "@/components/AuthPromptDialog";
import { Icon } from "@/components/Icon";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseAccountState } from "@/lib/supabase/useUser";
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
  const [pop, setPop] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authNext, setAuthNext] = useState("/");
  const pathname = usePathname() || "/";
  const { account, authLikely, loaded } = useSupabaseAccountState();
  const loggedIn = Boolean(account);
  const authPending = authLikely && !loaded;

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
    if (!prev) {
      // Pop the icon only when switching ON.
      setPop(true);
      window.setTimeout(() => setPop(false), 340);
    }
    const res = await toggleBookmarkAction(target);
    if (!res.ok) setOn(prev);
    else if (typeof res.bookmarked === "boolean") setOn(res.bookmarked);
    setBusy(false);
  }, [busy, on, target]);

  if (!isSupabaseConfigured()) return null;

  const label = on ? "Remove from library" : "Save to library";
  const isPrompt = target.kind === "example_prompt";
  const authCopy = isPrompt
    ? {
        title: "Create an account to save this Prompt",
        body: "Save Prompts to Favorites and access them from My Library.",
        icon: "code" as const,
      }
    : {
        title: "Create an account to save this Template",
        body: "Save Templates to Favorites and access them from My Library.",
        icon: "list" as const,
      };

  return (
    <>
      <button
        type="button"
        className={`bookmark-btn${on ? " on" : ""}${authPending ? " is-pending" : ""}`}
        aria-pressed={on}
        aria-label={label}
        disabled={busy || authPending}
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
        {!compact && (on ? "Saved" : "Save")}
      </button>
      <AuthPromptDialog
        open={authPromptOpen}
        next={authNext}
        title={authCopy.title}
        body={authCopy.body}
        icon={authCopy.icon}
        onClose={() => setAuthPromptOpen(false)}
      />
    </>
  );
}

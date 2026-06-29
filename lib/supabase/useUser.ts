"use client";

/* Reactive signed-in account state for client UI like the nav. Reads through a
 * same-origin route that uses the server auth cookie, so local dev and
 * production behave the same after server-action logins. The shared layout still
 * never calls cookies(), keeping marketing and catalog pages static. */

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured } from "./env";

export type SupabaseAccountProfile = {
  username: string | null;
};

export type SupabaseAccountUser = {
  email: string;
  profile: SupabaseAccountProfile;
};

export type SupabaseAccountState = {
  account: SupabaseAccountUser | null;
  authLikely: boolean;
  loaded: boolean;
};

type AccountStateResponse = {
  configured: boolean;
  user: SupabaseAccountUser | null;
};

const AUTH_HINT_COOKIE = "easyprompt.auth";

function hasAuthHintCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith(`${AUTH_HINT_COOKIE}=`));
}

async function fetchAccountState(): Promise<SupabaseAccountUser | null> {
  const res = await fetch("/api/account-state", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as AccountStateResponse;
  return data.user;
}

export function useSupabaseAccountState(): SupabaseAccountState {
  const [state, setState] = useState<SupabaseAccountState>({
    account: null,
    authLikely: false,
    loaded: false,
  });
  const pathname = usePathname();

  const refresh = useCallback(() => {
    setState((prev) => ({
      ...prev,
      authLikely: prev.authLikely || hasAuthHintCookie(),
    }));

    let active = true;
    fetchAccountState()
      .then((account) => {
        if (active) {
          setState({
            account,
            authLikely: Boolean(account),
            loaded: true,
          });
        }
      })
      .catch(() => {
        if (active) {
          setState((prev) => ({
            ...prev,
            authLikely: prev.authLikely || hasAuthHintCookie(),
            loaded: true,
          }));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // /api/account-state is the only source of truth for display auth. Browser
  // Supabase auth events are deliberately ignored because server actions own
  // sign-in/sign-out and can leave the browser client with stale/null state.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    return refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    function onFocus() {
      refresh();
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") refresh();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  return state;
}

export function useSupabaseAccount(): SupabaseAccountUser | null {
  return useSupabaseAccountState().account;
}

export function useSupabaseUser(): string | null {
  return useSupabaseAccount()?.email ?? null;
}

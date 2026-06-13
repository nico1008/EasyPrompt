"use client";

/* Client-side premium state + API calls.
 *
 * Storage is the whole "session": { token, code, plan } in localStorage. There
 * are no accounts. The stored `code` is what lets us silently re-mint a fresh
 * token when the old one expires (the 401 retry below). */

import { useCallback, useEffect, useState } from "react";

export type Plan = "lifetime" | "pass" | "subscription";

export type Booster = { id: string; label: string; note?: string; text: string };

type Stored = { token: string; code: string; plan: Plan };

const KEY = "easyprompt.premium";

export function readStored(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Stored;
    if (v && typeof v.token === "string" && typeof v.code === "string" && v.plan) return v;
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

function writeStored(v: Stored | null): void {
  if (typeof window === "undefined") return;
  if (v) window.localStorage.setItem(KEY, JSON.stringify(v));
  else window.localStorage.removeItem(KEY);
  // Let other components (e.g. PremiumProvider) react in the same tab.
  window.dispatchEvent(new Event("easyprompt:premium-change"));
}

export type UnlockResult =
  | { ok: true; plan: Plan; exp?: string }
  | { ok: false; reason: string };

/** POST a code to /api/entitlement and persist the session on success. */
export async function unlock(code: string): Promise<UnlockResult> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, reason: "malformed" };
  let res: Response;
  try {
    res = await fetch("/api/entitlement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: trimmed }),
    });
  } catch {
    return { ok: false, reason: "network-error" };
  }
  let body: { valid?: boolean; plan?: Plan; exp?: string; token?: string; reason?: string };
  try {
    body = await res.json();
  } catch {
    return { ok: false, reason: "bad-response" };
  }
  if (!res.ok || !body.valid || !body.token || !body.plan) {
    return { ok: false, reason: body.reason ?? "invalid" };
  }
  writeStored({ token: body.token, code: trimmed, plan: body.plan });
  return { ok: true, plan: body.plan, exp: body.exp };
}

export function lock(): void {
  writeStored(null);
}

/** GET /api/premium with the stored token. On 401, re-mint from the stored code
 *  and retry once; clear the session if that also fails. */
export async function fetchBoosters(templateId?: string): Promise<Booster[] | null> {
  const stored = readStored();
  if (!stored) return null;

  const url = `/api/premium${templateId ? `?template=${encodeURIComponent(templateId)}` : ""}`;
  const call = (token: string) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  let res = await call(stored.token);

  if (res.status === 401) {
    const re = await unlock(stored.code); // re-mint a fresh token
    if (!re.ok) {
      lock();
      return null;
    }
    const fresh = readStored();
    if (!fresh) return null;
    res = await call(fresh.token);
  }

  if (!res.ok) return null;
  try {
    const body = (await res.json()) as { boosters?: Booster[] };
    return body.boosters ?? [];
  } catch {
    return null;
  }
}

/** Reactive view of premium status for components. */
export function usePremium() {
  const [plan, setPlan] = useState<Plan | null>(null);

  const sync = useCallback(() => {
    setPlan(readStored()?.plan ?? null);
  }, []);

  useEffect(() => {
    sync();
    const onChange = () => sync();
    window.addEventListener("easyprompt:premium-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("easyprompt:premium-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [sync]);

  return {
    status: plan ? ("unlocked" as const) : ("locked" as const),
    plan,
    unlock: async (code: string) => {
      const r = await unlock(code);
      if (r.ok) sync();
      return r;
    },
    lock: () => {
      lock();
      sync();
    },
  };
}

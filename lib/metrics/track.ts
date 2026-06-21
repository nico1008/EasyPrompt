"use client";

/* Fire-and-forget usage tracking. trackUse posts a copy/open-in event; trackView
 * posts a view (the copy-through denominator). Gated by isSupabaseConfigured() and
 * fail-soft — tracking must never break a copy or a navigation. A per-page-session
 * Set dedups so rapid re-clicks don't spam the endpoint (the server's bucket dedup
 * is the durable backstop). */

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSessionId } from "./identity";
import type { MetricAction, MetricTarget } from "./schema";

const fired = new Set<string>();

function send(kind: string, key: string, action: string, sid: string): void {
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, key, action, sid }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* fail-soft */
  }
}

export function trackUse(target: MetricTarget, action: MetricAction): void {
  if (!isSupabaseConfigured()) return;
  const sid = getSessionId();
  if (!sid) return;
  const k = `${target.kind}:${target.key}:${action}`;
  if (fired.has(k)) return;
  fired.add(k);
  send(target.kind, target.key, action, sid);
}

export function trackView(target: MetricTarget): void {
  trackUse(target, "view");
}

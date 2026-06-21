"use client";

/* Fire a single `view` when an element actually enters the viewport (not on every
 * grid mount), via IntersectionObserver. Returns a ref to attach to the card root.
 * trackView already dedups per session, so this counts one impression per target.
 * SSR-safe and a no-op when Supabase is off or the observer is unavailable. */

import { useEffect, useRef } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { trackView } from "./track";
import type { MetricTarget } from "./schema";

export function useImpression<T extends HTMLElement>(target: MetricTarget) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    let done = false;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !done) {
            done = true;
            trackView(target);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target.kind, target.key]);

  return ref;
}

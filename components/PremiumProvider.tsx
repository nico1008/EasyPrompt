"use client";

/* Sets `data-premium="locked" | "unlocked"` on <html> from localStorage, so any
 * wrapper styled by `[data-premium="locked"]` / `[data-premium="unlocked"]`
 * toggles automatically. Mounted once in the root layout.
 *
 * Starts as "locked" on the server and first paint (storage isn't available
 * during SSR), then flips after mount — so locked is the safe default and there
 * is no flash of premium content for non-buyers. */

import { useEffect } from "react";
import { readStored } from "@/lib/premium/client";

export function PremiumProvider() {
  useEffect(() => {
    const apply = () => {
      const root = document.documentElement;
      root.dataset.premium = readStored() ? "unlocked" : "locked";
    };
    apply();
    window.addEventListener("easyprompt:premium-change", apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener("easyprompt:premium-change", apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  return null;
}

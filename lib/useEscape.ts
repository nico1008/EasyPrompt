"use client";

/* Standard app-wide Escape handling. While `active`, pressing Esc runs
 * `onEscape` — the one consistent meaning across the app: "close the current
 * view / overlay / menu". Mirrors the inline listener UserMenu/usePopover already
 * use, factored out so every dismissible surface behaves identically. */

import { useEffect } from "react";

export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onEscape();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onEscape]);
}

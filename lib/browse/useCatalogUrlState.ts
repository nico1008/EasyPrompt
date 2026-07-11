"use client";

import { useEffect } from "react";
import { catalogUrlPath } from "./catalogUrl";

export function useCatalogUrlState({
  ready,
  values,
  defaults,
}: {
  ready: boolean;
  values: Record<string, string>;
  defaults: Record<string, string>;
}) {
  useEffect(() => {
    if (!ready) return;
    const next = catalogUrlPath(window.location.href, values, defaults);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.replaceState(window.history.state, "", next);
  }, [defaults, ready, values]);
}

"use client";

/* One-shot confirmation toast driven by a `?flash=<key>` URL param. Server
 * Actions that finish by redirecting to a fresh page (e.g. creating a template
 * lands on its detail page) can't show inline feedback, so they append
 * `?flash=created` and this island announces it via the aria-live Toast, then
 * strips the param client-side so a refresh/back doesn't re-fire it. Render
 * inside a <Suspense> boundary (useSearchParams). */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Toast } from "./Toast";

const MESSAGES: Record<string, string> = {
  created: "Template created",
  updated: "Changes saved",
  saved: "Saved",
};

export function FlashToast() {
  const params = useSearchParams();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const flash = params.get("flash");
    if (!flash || !MESSAGES[flash]) return;
    setMsg(MESSAGES[flash]);
    // Strip the param purely client-side (no Next navigation / re-fetch) so a
    // refresh or Back doesn't re-toast.
    const url = new URL(window.location.href);
    url.searchParams.delete("flash");
    window.history.replaceState(null, "", url.toString());
    const t = window.setTimeout(() => setMsg(null), 2600);
    return () => window.clearTimeout(t);
  }, [params]);

  return <Toast show={Boolean(msg)} message={msg ?? ""} />;
}

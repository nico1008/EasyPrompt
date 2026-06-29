"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { copyText } from "@/lib/clipboard";

export function ShareProfileButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function onShare() {
    const origin = window.location.origin;
    const ok = await copyText(`${origin}/${username}`);
    if (ok) setCopied(true);
  }

  return (
    <button
      type="button"
      className="profile-share-btn"
      onClick={onShare}
      aria-live="polite"
    >
      <Icon name={copied ? "check" : "share"} size={14} />
      {copied ? "Copied" : "Share profile"}
    </button>
  );
}

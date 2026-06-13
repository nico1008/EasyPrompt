"use client";

/* Paste-a-code form. Verifies via /api/entitlement and, on success, flips the
 * whole site to the unlocked state (PremiumProvider picks up the storage event).
 * Used on /pricing and inside the Builder's locked Pro panel. */

import { useState, type FormEvent } from "react";
import { usePremium } from "@/lib/premium/client";

const REASON_COPY: Record<string, string> = {
  "bad-signature": "That code isn't valid. Check for a typo or paste it again.",
  malformed: "That doesn't look like a valid code.",
  expired: "This pass has expired. Grab a new one to keep the extras.",
  "missing-exp": "That code is malformed (no expiry).",
  invalid: "That code isn't valid.",
  pending: "Payment hasn't cleared yet — try again in a minute.",
  "network-error": "Couldn't reach the server. Check your connection and retry.",
};

export function UnlockForm({ compact = false }: { compact?: boolean }) {
  const { status, plan, unlock, lock } = usePremium();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await unlock(code);
    setBusy(false);
    if (r.ok) setCode("");
    else setError(REASON_COPY[r.reason] ?? "That code isn't valid.");
  }

  if (status === "unlocked") {
    return (
      <div className={`unlock unlock-done${compact ? " compact" : ""}`}>
        <p className="unlock-ok">
          Pro unlocked{plan ? ` · ${plan}` : ""} ✓
        </p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={lock}>
          Remove code from this device
        </button>
      </div>
    );
  }

  return (
    <form className={`unlock${compact ? " compact" : ""}`} onSubmit={onSubmit}>
      <label htmlFor="access-code">Have an access code?</label>
      <div className="unlock-row">
        <input
          id="access-code"
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn btn-primary" type="submit" disabled={busy || !code.trim()}>
          {busy ? "Checking…" : "Unlock"}
        </button>
      </div>
      {error && <p className="unlock-err">{error}</p>}
    </form>
  );
}

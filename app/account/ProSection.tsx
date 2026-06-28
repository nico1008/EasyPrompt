"use client";

/* Account-bound Pro: shows the current entitlement and lets the user redeem an
 * access code against their account (so Pro follows them across devices). On a
 * successful redeem we adopt the freshly-minted token locally so Pro lights up
 * immediately, without waiting for a re-login. */

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { redeemEntitlementAction, type RedeemState } from "@/lib/entitlements/actions";
import { adoptAccountToken } from "@/lib/premium/client";
import type { Plan } from "@/lib/access/code";

const EMPTY: RedeemState = {};

const PLAN_LABEL: Record<Plan, string> = {
  lifetime: "Lifetime",
  pass: "Day pass",
  subscription: "Subscription",
};

function RedeemButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary btn-sm" type="submit" disabled={pending}>
      {pending ? "Checking…" : "Redeem code"}
    </button>
  );
}

export function ProSection({
  currentPlan,
  entExp,
}: {
  currentPlan: Plan | null;
  entExp?: string;
}) {
  const [state, action] = useActionState(redeemEntitlementAction, EMPTY);

  // Activate Pro on this device the moment a redeem succeeds.
  useEffect(() => {
    if (state.ok && state.token && state.plan) adoptAccountToken(state.token, state.plan);
  }, [state.ok, state.token, state.plan]);

  const plan: Plan | null = state.ok && state.plan ? state.plan : currentPlan;
  const until = entExp ? new Date(entExp).toLocaleDateString() : null;

  return (
    <form id="pro" action={action} className="panel account-card account-section">
      <h2>Pro</h2>
      {plan ? (
        <p className="account-ok" role="status">
          Pro active — {PLAN_LABEL[plan]}
          {until ? ` (until ${until})` : ""}. It follows you on every device you log into.
        </p>
      ) : (
        <p className="muted">
          No Pro on this account yet. Paste an access code to activate it everywhere you log in.
        </p>
      )}
      <div className="field">
        <label htmlFor="a-code">Access code</label>
        <input
          id="a-code"
          name="code"
          className="input"
          placeholder="Paste your code"
          autoComplete="off"
        />
      </div>
      {state.error && (
        <p className="account-err" role="alert">
          {state.error}
        </p>
      )}
      <div className="account-section-foot">
        <RedeemButton />
      </div>
    </form>
  );
}

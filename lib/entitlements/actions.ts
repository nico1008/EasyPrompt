"use server";

/* Account-bound Pro entitlement mutations.
 *
 * redeemEntitlementAction — a logged-in user pastes an access code; we run the
 *   same provider check as /api/entitlement, persist the result to `entitlements`
 *   (so it follows them across devices), and return a freshly-minted token the
 *   client adopts for instant Pro.
 * getEntitlementToken — mints a token from the user's stored entitlement; called
 *   on login so Pro lights up on any device without re-entering the code.
 *
 * The anonymous code path (/api/entitlement → localStorage) is untouched. */

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getProvider, DEFAULT_PROVIDER } from "@/lib/providers";
import type { Env } from "@/lib/providers/types";
import type { Plan } from "@/lib/access/code";
import { getEntitlement } from "./repo";
import { hashCode, mintEntitlementToken } from "./token";

export type RedeemState = { ok?: boolean; error?: string; token?: string; plan?: Plan };

function readEnv(): Env {
  return {
    ACCESS_SIGNING_SECRET: process.env.ACCESS_SIGNING_SECRET,
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
    CRYPTO_API_URL: process.env.CRYPTO_API_URL,
    CRYPTO_API_KEY: process.env.CRYPTO_API_KEY,
  };
}

export async function redeemEntitlementAction(
  _prev: RedeemState,
  formData: FormData
): Promise<RedeemState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };

  const env = readEnv();
  if (!env.ACCESS_SIGNING_SECRET) return { error: "Premium isn't configured here." };

  const user = await getServerUser();
  if (!user) return { error: "Please log in first." };

  const code = (formData.get("code") as string | null)?.trim();
  if (!code) return { error: "Enter your access code." };

  const now = new Date();
  const result = await getProvider(env.PAYMENT_PROVIDER).check(code, env, now);
  if (!result.valid || !result.plan) {
    return { error: "That code didn't check out. Double-check and try again." };
  }

  const supabase = await createClient();
  const code_hash = await hashCode(env.ACCESS_SIGNING_SECRET, code);
  const { error } = await supabase.from("entitlements").upsert(
    {
      owner_id: user.id,
      plan: result.plan,
      source: env.PAYMENT_PROVIDER ?? DEFAULT_PROVIDER,
      code_hash,
      ent_exp: result.exp ?? null,
    },
    { onConflict: "owner_id" }
  );
  if (error) return { error: "Couldn't save your entitlement. Please try again." };

  const token = await mintEntitlementToken(
    env.ACCESS_SIGNING_SECRET,
    { plan: result.plan, entExp: result.exp },
    now
  );

  revalidatePath("/account");
  return { ok: true, token, plan: result.plan };
}

/** Mint a premium token from the signed-in user's stored entitlement, or null. */
export async function getEntitlementToken(): Promise<{ token: string; plan: Plan } | null> {
  if (!isSupabaseConfigured()) return null;
  const secret = process.env.ACCESS_SIGNING_SECRET;
  if (!secret) return null;

  const ent = await getEntitlement();
  if (!ent) return null;

  const token = await mintEntitlementToken(secret, ent, new Date());
  return { token, plan: ent.plan };
}

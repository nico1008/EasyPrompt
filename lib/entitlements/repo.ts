import "server-only";

/* Read helper for account-bound Pro entitlements. RLS scopes the query to the
 * signed-in owner. Returns the *active* entitlement (no row, or an expired
 * `pass`, both read as "no Pro"). */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Plan } from "@/lib/access/code";

export type EntitlementRow = Database["public"]["Tables"]["entitlements"]["Row"];

export type ActiveEntitlement = { plan: Plan; entExp?: string };

/** The signed-in user's active entitlement, or null. */
export async function getEntitlement(): Promise<ActiveEntitlement | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("entitlements").select("*").maybeSingle();
  if (!data) return null;

  // A `pass` with a past ent_exp is no longer active.
  if (data.ent_exp && Date.parse(data.ent_exp) <= Date.now()) return null;

  return { plan: data.plan, entExp: data.ent_exp ?? undefined };
}

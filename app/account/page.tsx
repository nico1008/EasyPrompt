import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "../my/my.css";
import { Eyebrow } from "@/components/Eyebrow";
import { AccountForms } from "./AccountForms";
import { ProSection } from "./ProSection";
import { createClient, getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getEntitlement } from "@/lib/entitlements/repo";

export const metadata: Metadata = {
  title: "Account settings",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const user = await getServerUser();
  if (!user) redirect("/login?next=/account");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const entitlement = await getEntitlement();

  return (
    <main className="my-page account-page">
      <div className="account-wrap">
        <Eyebrow>Settings</Eyebrow>
        <h1>Account</h1>
        <AccountForms
          email={user.email ?? ""}
          displayName={profile?.display_name ?? ""}
          username={profile?.username ?? ""}
        />
        <ProSection
          currentPlan={entitlement?.plan ?? null}
          entExp={entitlement?.entExp}
        />
      </div>
    </main>
  );
}

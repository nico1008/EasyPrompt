import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "../my/my.css";
import { Icon } from "@/components/Icon";
import { AccountDangerZone, AccountForms } from "../account/AccountForms";
import { ProSection } from "../account/ProSection";
import { createClient, getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getEntitlement } from "@/lib/entitlements/repo";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const user = await getServerUser();
  if (!user) redirect("/login?next=/settings");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, bio")
    .eq("id", user.id)
    .maybeSingle();

  const entitlement = await getEntitlement();
  const username = profile?.username ?? "";
  const initial = (username.trim()[0] ?? "?").toUpperCase();

  return (
    <main className="my-page account-page">
      <div className="account-layout">
        <aside className="account-sidebar" aria-label="Settings sections">
          <nav className="account-nav" aria-label="Settings sections">
            <a className="is-active" href="#profile" aria-current="true">
              <Icon name="user" size={15} /> Profile
            </a>
            <a href="#password">
              <Icon name="shield" size={15} /> Password
            </a>
            <a href="#pro">
              <Icon name="zap" size={15} /> Pro
            </a>
            <a href="#danger-zone">
              <Icon name="trash" size={15} /> Danger zone
            </a>
          </nav>
        </aside>

        <div className="account-main">
          <header className="account-head">
            <span className="account-kicker">Settings</span>
            <h1>Settings</h1>
            <p>Manage your public profile, password, Pro access, and account deletion.</p>
          </header>

          <AccountForms username={username} bio={profile?.bio ?? ""} />
          <ProSection
            currentPlan={entitlement?.plan ?? null}
            entExp={entitlement?.entExp}
          />
          <AccountDangerZone />
        </div>

        <aside className="account-identity" aria-label="Account summary">
          <div className="account-side-card">
            <span className="account-avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="account-side-id">
              <strong>{username ? `@${username}` : "Your account"}</strong>
              <span>Public creator profile</span>
            </div>
            {username ? (
              <Link className="account-public-link" href={`/${username}`}>
                View profile
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}

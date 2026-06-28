import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "../my/my.css";
import { Icon } from "@/components/Icon";
import { AccountDangerZone, AccountForms } from "./AccountForms";
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
    .select("username, display_name, bio, is_public")
    .eq("id", user.id)
    .maybeSingle();

  const entitlement = await getEntitlement();
  const email = user.email ?? "";
  const username = profile?.username ?? "";
  const isPublic = profile?.is_public ?? false;
  const initial = (email.trim()[0] ?? "?").toUpperCase();

  return (
    <main className="my-page account-page">
      <div className="account-layout">
        <aside className="account-sidebar" aria-label="Account settings">
          <div className="account-side-card">
            <span className="account-avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="account-side-id">
              <strong>{profile?.display_name || username || "Your account"}</strong>
              <span title={email}>{email}</span>
            </div>
            <span className={`account-visibility ${isPublic ? "is-public" : ""}`}>
              {isPublic ? "Public profile" : "Private profile"}
            </span>
            {isPublic && username ? (
              <Link className="account-public-link" href={`/u/${username}`}>
                View public profile
              </Link>
            ) : null}
          </div>

          <nav className="account-nav" aria-label="Settings sections">
            <a className="is-active" href="#public-profile" aria-current="true">
              <Icon name="user" size={15} /> Public profile
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
            <h1>Account</h1>
            <p>Manage your profile, sign-in details, Pro access, and account deletion.</p>
          </header>

          <AccountForms
            email={email}
            displayName={profile?.display_name ?? ""}
            username={username}
            bio={profile?.bio ?? ""}
            isPublic={isPublic}
          />
          <ProSection
            currentPlan={entitlement?.plan ?? null}
            entExp={entitlement?.entExp}
          />
          <AccountDangerZone />
        </div>
      </div>
    </main>
  );
}

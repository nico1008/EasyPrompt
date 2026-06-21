import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "./profile.css";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPublicProfile, getPublicProfileContent } from "@/lib/profiles/repo";
import { PublicProfile } from "@/components/PublicProfile";

/* Public, opt-in author profile. ISR (cacheable, indexable) — reads go through the
 * security-definer public_profile* RPCs and NEVER touch the signed-in user, so the
 * route stays static-friendly and doesn't flip the app dynamic. Returns 404 for a
 * username that isn't a real, public profile (so private accounts can't be probed). */
export const dynamicParams = true;
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  if (!isSupabaseConfigured()) return { robots: { index: false, follow: false } };
  const profile = await getPublicProfile(username);
  if (!profile) return { title: "Profile not found", robots: { index: false, follow: false } };
  const name = profile.displayName?.trim() || `@${profile.username}`;
  return {
    title: `${name} (@${profile.username})`,
    description: profile.bio?.trim() || `${name}'s published prompts and templates on EasyPrompt.`,
    alternates: { canonical: `/u/${profile.username}` },
    openGraph: {
      title: `${name} on EasyPrompt`,
      description: profile.bio?.trim() || `Published prompts and templates by ${name}.`,
      url: `/u/${profile.username}`,
      type: "profile",
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();
  const { username } = await params;

  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const items = await getPublicProfileContent(username);
  return <PublicProfile profile={profile} items={items} />;
}

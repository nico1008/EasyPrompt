import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "./profile.css";
import { isReservedUsername } from "@/lib/auth/usernames";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPublicProfile, getPublicProfileContent } from "@/lib/profiles/repo";
import { PublicProfile } from "@/components/PublicProfile";

/* Public account profile. Reads go through security-definer public_profile* RPCs
 * and never touch the signed-in user, so the route stays cacheable. */
export const dynamicParams = true;
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  if (!isSupabaseConfigured() || isReservedUsername(username)) {
    return { robots: { index: false, follow: false } };
  }
  const profile = await getPublicProfile(username);
  if (!profile) return { title: "Profile not found", robots: { index: false, follow: false } };
  const name = profile.username;
  return {
    title: `${name} - EasyPrompt creator profile`,
    description: profile.bio?.trim() || `${name}'s public Templates, Prompts, and Workflows on EasyPrompt.`,
    alternates: { canonical: `/${profile.username}` },
    openGraph: {
      title: `${name} on EasyPrompt`,
      description: profile.bio?.trim() || `Public prompts and templates by ${name}.`,
      url: `/${profile.username}`,
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
  if (isReservedUsername(username)) notFound();

  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const items = await getPublicProfileContent(username);
  return <PublicProfile profile={profile} items={items} />;
}

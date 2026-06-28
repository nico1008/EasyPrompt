import "server-only";

/* Public profile reads via the security-definer public_profile* RPCs. Anon-safe;
 * never reads the signed-in user, so the /[username] route stays cacheable. */

import { createPublicClient } from "@/lib/supabase/server";
import type { IconName } from "@/components/iconNames";
import { blurbFromBody } from "@/lib/community/map";

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  createdAt: string;
  reputation: number;
};

export type PublicProfileItem = {
  objectType: "prompt" | "template";
  slug: string;
  title: string;
  blurb: string;
  category: string | null;
  icon: IconName;
  updatedAt: string;
  uses: number;
};

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("public_profile", {
    p_username: username.toLowerCase(),
  });
  if (error || !data || data.length === 0) return null;
  const r = data[0];
  return {
    id: r.id,
    username: r.username ?? username,
    displayName: r.display_name,
    bio: r.bio,
    createdAt: r.created_at,
    reputation: r.reputation,
  };
}

export async function getPublicProfileContent(username: string): Promise<PublicProfileItem[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("public_profile_content", {
    p_username: username.toLowerCase(),
  });
  if (error || !data) return [];
  return data.map((r) => ({
    objectType: r.object_type,
    slug: r.share_slug,
    title: r.title,
    blurb:
      r.object_type === "prompt"
        ? blurbFromBody(r.preview)
        : r.preview?.trim() || "A community template.",
    category: r.category,
    icon: (r.icon as IconName) ?? "letter",
    updatedAt: r.updated_at,
    uses: r.uses,
  }));
}

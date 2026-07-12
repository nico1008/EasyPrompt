import "server-only";

/* Public profile reads via the security-definer public_profile* RPCs. Anon-safe;
 * never reads the signed-in user, so the /[username] route stays cacheable. */

import { createPublicClient } from "@/lib/supabase/server";
import type { IconName } from "@/components/iconNames";
import { blurbFromBody } from "@/lib/community/map";

export type PublicProfile = {
  id: string;
  username: string;
  bio: string | null;
  createdAt: string;
  reputation: number;
};

export type PublicProfileItem = {
  objectType: "prompt" | "template" | "workflow";
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
    bio: r.bio,
    createdAt: r.created_at,
    reputation: r.reputation,
  };
}

export async function getPublicProfileContent(username: string): Promise<PublicProfileItem[]> {
  const supabase = createPublicClient();
  const [content, workflows] = await Promise.all([supabase.rpc("public_profile_content", { p_username: username.toLowerCase() }), supabase.rpc("public_profile_workflows", { p_username: username.toLowerCase() })]);
  const items: PublicProfileItem[] = content.error || !content.data ? [] : content.data.map((r) => ({
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
  if (!workflows.error) for (const row of workflows.data ?? []) items.push({ objectType:"workflow", slug:row.share_slug, title:row.title, blurb:row.blurb, category:row.category, icon:"book", updatedAt:row.updated_at, uses:0 });
  return items.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}

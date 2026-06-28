import { CommunityCard } from "./CommunityCard";
import { ReputationBadge } from "./ReputationBadge";
import type { CommunityCard as CommunityCardModel } from "@/lib/community/map";
import type { PublicProfile as Profile, PublicProfileItem } from "@/lib/profiles/repo";

/* Public, indexable profile (/<username>). Shows contributions and helpfulness.
 * Header includes identity, bio, stats, and reputation. The grid reuses the
 * community card shell. */

function initial(name: string): string {
  return (name.trim()[0] || "?").toUpperCase();
}

/* Profile items render with the same CommunityCard as the catalog community
   sections. author is null, so there is no self-link chip on your own profile. */
function toCard(it: PublicProfileItem): CommunityCardModel {
  return {
    objectType: it.objectType,
    slug: it.slug,
    title: it.title || "Untitled",
    blurb: it.blurb,
    icon: it.icon,
    tag: it.objectType === "prompt" ? "Prompt" : "Template",
    category: it.category,
    href: it.objectType === "prompt" ? `/prompts/${it.slug}` : `/p/${it.slug}`,
    author: null,
    createdAt: it.updatedAt,
  };
}

export function PublicProfile({
  profile,
  items,
}: {
  profile: Profile;
  items: PublicProfileItem[];
}) {
  const name = profile.displayName?.trim() || `@${profile.username}`;
  const since = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const totalUses = items.reduce((sum, i) => sum + (i.uses || 0), 0);

  return (
    <main className="profile-page">
      <div className="profile-wrap">
        <header className="profile-head panel">
          <div className="profile-avatar" aria-hidden="true">
            {initial(name)}
          </div>
          <div className="profile-id">
            <div className="profile-name-row">
              <h1>{name}</h1>
              <ReputationBadge reputation={profile.reputation} />
            </div>
            <p className="profile-handle">@{profile.username}</p>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <div className="profile-stats">
              <span>
                <strong>{items.length}</strong> published
              </span>
              <span aria-hidden="true">.</span>
              <span>
                <strong>{totalUses}</strong> {totalUses === 1 ? "use" : "uses"}
              </span>
              <span aria-hidden="true">.</span>
              <span>Member since {since}</span>
            </div>
          </div>
        </header>

        {items.length === 0 ? (
          <p className="profile-empty">No published Prompts or Templates yet.</p>
        ) : (
          <div className="profile-grid">
            {items.map((it) => (
              <CommunityCard key={it.slug} card={toCard(it)} uses={it.uses} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

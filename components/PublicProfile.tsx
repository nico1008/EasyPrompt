import Link from "next/link";
import { Icon } from "./Icon";
import { ReputationBadge } from "./ReputationBadge";
import { ShareProfileButton } from "./ShareProfileButton";
import { categoryLabel } from "@/data/templates";
import { compactNumber } from "@/lib/metrics/format";
import type { PublicProfile as Profile, PublicProfileItem } from "@/lib/profiles/repo";

/* Public, indexable profile (/<username>). Shows creator identity, public work,
 * and usage stats without reading private auth state. */

function initial(name: string): string {
  return (name.trim()[0] || "?").toUpperCase();
}

function formattedMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formattedShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function titleFor(it: PublicProfileItem): string {
  if (it.title?.trim()) return it.title.trim();
  return it.objectType === "prompt" ? "Untitled prompt" : "Untitled template";
}

function blurbFor(it: PublicProfileItem): string {
  if (it.blurb?.trim()) return it.blurb.trim();
  return it.objectType === "prompt"
    ? "A ready-to-use prompt published on EasyPrompt."
    : "A reusable template published on EasyPrompt.";
}

function itemHref(it: PublicProfileItem): string {
  return it.objectType === "prompt" ? `/prompts/${it.slug}` : `/p/${it.slug}`;
}

function itemMeta(it: PublicProfileItem): string {
  if (it.category?.trim()) return categoryLabel(it.category);
  return it.objectType === "prompt" ? "Ready prompt" : "Reusable template";
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function ProfileWorkCard({ item }: { item: PublicProfileItem }) {
  const isPrompt = item.objectType === "prompt";
  const type = isPrompt ? "Prompt" : "Template";
  const uses = item.uses || 0;

  return (
    <article className={`profile-work-card is-${item.objectType}`}>
      <div className="profile-card-top">
        <span className="profile-type-chip">
          <Icon name={isPrompt ? "code" : "list"} size={13} />
          {type}
        </span>
        <span className="profile-card-date">Updated {formattedShortDate(item.updatedAt)}</span>
      </div>
      <div className="profile-card-body">
        <h3>
          <Link href={itemHref(item)}>{titleFor(item)}</Link>
        </h3>
        <p>{blurbFor(item)}</p>
      </div>
      <div className="profile-card-foot">
        <span>{itemMeta(item)}</span>
        <span className="profile-uses">
          <Icon name="zap" size={13} />
          {compactNumber(uses)} {plural(uses, "use", "uses")}
        </span>
      </div>
    </article>
  );
}

export function PublicProfile({
  profile,
  items,
}: {
  profile: Profile;
  items: PublicProfileItem[];
}) {
  const name = profile.displayName?.trim() || profile.username;
  const since = formattedMonth(profile.createdAt);
  const totalUses = items.reduce((sum, i) => sum + (i.uses || 0), 0);
  const templateCount = items.filter((i) => i.objectType === "template").length;
  const promptCount = items.filter((i) => i.objectType === "prompt").length;

  return (
    <main className="profile-page">
      <div className="profile-wrap">
        <header className="profile-head panel">
          <div className="profile-avatar-wrap" aria-hidden="true">
            <div className="profile-avatar">{initial(name)}</div>
          </div>

          <div className="profile-id">
            <div className="profile-name-row">
              <div>
                <h1>{name}</h1>
                <p className="profile-username">{profile.username}</p>
              </div>
              <ReputationBadge reputation={profile.reputation} />
            </div>

            {profile.bio?.trim() ? (
              <p className="profile-bio">{profile.bio.trim()}</p>
            ) : (
              <p className="profile-bio is-muted">Creator profile on EasyPrompt.</p>
            )}
            <p className="profile-since">Member since {since}</p>
          </div>

          <div className="profile-actions">
            <ShareProfileButton username={profile.username} />
          </div>
        </header>

        <section className="profile-stats-grid" aria-label="Creator stats">
          <div className="profile-stat">
            <strong>{items.length}</strong>
            <span>Published {plural(items.length, "item", "items")}</span>
          </div>
          <div className="profile-stat">
            <strong>{compactNumber(totalUses)}</strong>
            <span>Total {plural(totalUses, "use", "uses")}</span>
          </div>
          <div className="profile-stat">
            <strong>{templateCount}</strong>
            <span>{plural(templateCount, "Template", "Templates")}</span>
          </div>
          <div className="profile-stat">
            <strong>{promptCount}</strong>
            <span>{plural(promptCount, "Prompt", "Prompts")}</span>
          </div>
        </section>

        <section className="profile-work">
          <div className="profile-section-head">
            <div>
              <h2>Public work</h2>
              <p>
                {items.length > 0
                  ? "Latest published templates and prompts from this creator."
                  : "Published templates and prompts will appear here."}
              </p>
            </div>
            {items.length > 0 && (
              <div className="profile-section-counts" aria-label="Public work counts">
                {templateCount > 0 && (
                  <span>
                    {templateCount} {plural(templateCount, "template", "templates")}
                  </span>
                )}
                {promptCount > 0 && (
                  <span>
                    {promptCount} {plural(promptCount, "prompt", "prompts")}
                  </span>
                )}
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="profile-empty panel">
              <span className="profile-empty-icon" aria-hidden="true">
                <Icon name="user" size={22} />
              </span>
              <h3>No public work yet</h3>
              <p>
                This creator has not published any templates or prompts. Check back after
                they share work with the community.
              </p>
            </div>
          ) : (
            <div className="profile-work-grid">
              {items.map((it) => (
                <ProfileWorkCard key={`${it.objectType}-${it.slug}`} item={it} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

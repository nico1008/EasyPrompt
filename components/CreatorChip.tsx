import Link from "next/link";
import { Icon } from "./Icon";
import type { Creator } from "@/lib/browse/types";

/* The creator byline shown on detail pages (prompt + template), identical on both:
 *   - house → a brand disc + "EasyPrompt" + a verified tick (non-link);
 *   - community → the author's avatar + name, linking to their public profile
 *     (renders only when they opted public; null otherwise — privacy preserved).
 * A borderless verified-byline treatment — see `.creator-tag` in globals.css. */
export function CreatorChip({ creator }: { creator: Creator }) {
  if (creator.kind === "house") {
    return (
      <span className="creator-tag is-house" aria-label="Creator: EasyPrompt">
        <span className="ct-avatar ct-avatar-house" aria-hidden="true">
          <Icon name="shield" size={15} />
        </span>
        <span className="ct-name">EasyPrompt</span>
        <span className="ct-verified" aria-hidden="true">
          <Icon name="check" size={11} strokeWidth={3} />
        </span>
      </span>
    );
  }

  const author = creator.author;
  if (!author) return null;
  const name = author.displayName?.trim() || `@${author.username}`;
  const initial = (name.trim()[0] || "?").toUpperCase();
  return (
    <Link
      className="creator-tag is-community"
      href={`/u/${author.username}`}
      aria-label={`Creator: @${author.username}`}
    >
      <span className="ct-avatar ct-avatar-initial" aria-hidden="true">
        {initial}
      </span>
      <span className="ct-name">{name}</span>
    </Link>
  );
}

import Link from "next/link";
import { Icon } from "./Icon";
import type { CommunityAuthor } from "@/lib/community/map";

/* Author attribution on community cards/detail. Links to the author's public
 * profile — but ONLY renders when the author opted their profile public (the
 * listing RPCs return a handle only then), so non-opted-in authors stay private.
 * `stopPropagation` so a tap on the chip inside a card navigates to the profile,
 * not the card. */
export function AuthorChip({
  author,
  className,
}: {
  author: CommunityAuthor | null;
  className?: string;
}) {
  if (!author) return null;
  const label = author.displayName?.trim() || `@${author.username}`;
  return (
    <Link
      className={`author-chip${className ? ` ${className}` : ""}`}
      href={`/u/${author.username}`}
      onClick={(e) => e.stopPropagation()}
      title={`@${author.username}`}
    >
      <Icon name="user" size={12} />
      {label}
    </Link>
  );
}

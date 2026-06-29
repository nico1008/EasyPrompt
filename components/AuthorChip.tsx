import Link from "next/link";
import { Icon } from "./Icon";
import type { CommunityAuthor } from "@/lib/community/map";

/* Author attribution on community cards/detail. Links to the author's account
 * profile when the RPC returns a username. `stopPropagation` keeps taps on the
 * chip inside a card from navigating to the card itself. */
export function AuthorChip({
  author,
  className,
}: {
  author: CommunityAuthor | null;
  className?: string;
}) {
  if (!author) return null;
  const label = `@${author.username}`;
  return (
    <Link
      className={`author-chip${className ? ` ${className}` : ""}`}
      href={`/${author.username}`}
      onClick={(e) => e.stopPropagation()}
      title={`@${author.username}`}
      aria-label={`Creator: @${author.username}`}
    >
      <Icon name="user" size={12} />
      {label}
    </Link>
  );
}

import { Icon } from "./Icon";
import { AuthorChip } from "./AuthorChip";
import type { Creator } from "@/lib/browse/types";

/* One creator label for both origins, on cards and detail views:
 *   - community → the author link (AuthorChip; renders only when the author opted
 *     their profile public, otherwise null);
 *   - house → a non-link "EasyPrompt" brand chip.
 * Both carry an aria-label so origin is announced now that the visual
 * "From the community" section heading is gone. */
export function CreatorChip({ creator, className }: { creator: Creator; className?: string }) {
  if (creator.kind === "community") {
    return <AuthorChip author={creator.author} className={className} />;
  }
  return (
    <span
      className={`creator-chip creator-house${className ? ` ${className}` : ""}`}
      aria-label="Creator: EasyPrompt"
    >
      <Icon name="shield" size={12} />
      EasyPrompt
    </span>
  );
}

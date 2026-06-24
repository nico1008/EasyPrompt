import { Icon } from "./Icon";
import { remixPublishedPromptAction } from "@/lib/savedPrompts/actions";

/* "Use as starting point" — the remix form for a community Prompt. A *server*
 * component on purpose: it owns the raw server-action `<form>` so the action never
 * enters the client component graph (importing it into the client CommunityPrompt
 * broke the route's server render). Passed into CommunityPrompt as a slot. */
export function RemixStarter({ slug }: { slug: string }) {
  return (
    <form action={remixPublishedPromptAction}>
      <input type="hidden" name="share_slug" value={slug} />
      <button type="submit" className="btn btn-ink">
        <Icon name="wrench" size={15} /> Use as starting point
      </button>
    </form>
  );
}

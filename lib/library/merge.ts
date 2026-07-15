import type { BookmarkTarget } from "@/lib/bookmarks/schema";
import type { LibraryItem } from "@/lib/library/list";
import { favoriteLibraryItemKey } from "@/lib/workspaces/schema";

type FavoriteLike = { target: BookmarkTarget };

function targetKey(target: BookmarkTarget): string {
  return `${target.kind}:${target.key}`;
}

function ownedBookmarkTarget(item: LibraryItem): BookmarkTarget | null {
  if (item.visibility !== "public" || !item.shareSlug) return null;
  if (item.internal === "saved_prompt") {
    return { kind: "user_prompt", key: item.shareSlug };
  }
  if (item.internal === "user_workflow") {
    return { kind: "user_workflow", key: item.shareSlug };
  }
  return { kind: "user_template", key: item.shareSlug };
}

/**
 * A bookmark of the user's own public content is state on the owned item, not a
 * second Library object. Return aliases so existing workspace memberships that
 * point at the favorite key continue to resolve to the canonical owned card.
 */
export function mergeOwnedFavorites<T extends FavoriteLike>(
  ownedItems: LibraryItem[],
  favorites: T[]
): {
  favoriteTargetByOwnedKey: Map<string, BookmarkTarget>;
  favoriteKeysByOwnedKey: Map<string, string[]>;
  externalFavorites: T[];
} {
  const favoriteByTarget = new Map(
    favorites.map((favorite) => [targetKey(favorite.target), favorite] as const)
  );
  const claimedTargets = new Set<string>();
  const favoriteTargetByOwnedKey = new Map<string, BookmarkTarget>();
  const favoriteKeysByOwnedKey = new Map<string, string[]>();

  for (const item of ownedItems) {
    const target = ownedBookmarkTarget(item);
    if (!target || !favoriteByTarget.has(targetKey(target))) continue;
    claimedTargets.add(targetKey(target));
    favoriteTargetByOwnedKey.set(item.key, target);
    const favoriteKey = favoriteLibraryItemKey(target);
    favoriteKeysByOwnedKey.set(item.key, [favoriteKey]);
  }

  return {
    favoriteTargetByOwnedKey,
    favoriteKeysByOwnedKey,
    externalFavorites: favorites.filter(
      (favorite) => !claimedTargets.has(targetKey(favorite.target))
    ),
  };
}

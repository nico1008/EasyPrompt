import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "./my.css";
import { Eyebrow } from "@/components/Eyebrow";
import { Icon } from "@/components/Icon";
import { LibraryBrowser, type LibraryBrowserItem } from "@/components/library/LibraryBrowser";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listNotebooks } from "@/lib/notebooks/repo";
import { listUserTemplates } from "@/lib/userTemplates/repo";
import { listSavedPrompts } from "@/lib/savedPrompts/repo";
import { listBookmarks } from "@/lib/bookmarks/repo";
import { listUserWorkflows } from "@/lib/userWorkflows/repo";
import { resolveFavoriteRows } from "@/lib/bookmarks/resolve";
import { buildLibrary, isLibraryFilter, type LibraryFilter } from "@/lib/library/list";
import { mergeOwnedFavorites } from "@/lib/library/merge";
import { favoriteLibraryItemKey } from "@/lib/workspaces/schema";
import { listLibraryWorkspaceData } from "@/lib/workspaces/repo";

export const metadata: Metadata = {
  title: "My Library",
  robots: { index: false, follow: false },
};

export default async function MyLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/");
  const user = await getServerUser();
  if (!user) redirect("/login?next=/my");

  const { filter: raw } = await searchParams;
  const filter: LibraryFilter = isLibraryFilter(raw) ? raw : "all";
  const [notebooks, userTemplates, prompts, workflows, bookmarkRows, workspaceData] = await Promise.all([
    listNotebooks(),
    listUserTemplates(),
    listSavedPrompts(),
    listUserWorkflows(),
    listBookmarks(),
    listLibraryWorkspaceData(),
  ]);
  const [ownedItems, favorites] = await Promise.all([
    Promise.resolve(buildLibrary({ notebooks, userTemplates, prompts, workflows })),
    resolveFavoriteRows(bookmarkRows),
  ]);
  const mergedFavorites = mergeOwnedFavorites(ownedItems, favorites);

  const browserItems: LibraryBrowserItem[] = [
    ...ownedItems.map((item) => ({
      key: item.key,
      title: item.title,
      objectType: item.objectType,
      meta: item.meta,
      preview: item.preview,
      categoryLabel: item.categoryLabel,
      sourceLabel: item.source?.label ?? null,
      updatedAt: item.updatedAt,
      isFavorite: mergedFavorites.favoriteTargetByOwnedKey.has(item.key),
      href: item.primaryHref,
      icon: item.icon,
      visibility: item.visibility,
      ownedItem: item,
      favoriteTarget: mergedFavorites.favoriteTargetByOwnedKey.get(item.key) ?? null,
      membershipKeys: [
        item.key,
        ...(mergedFavorites.favoriteKeysByOwnedKey.get(item.key) ?? []),
      ],
    })),
    ...mergedFavorites.externalFavorites.map((item) => ({
      key: favoriteLibraryItemKey(item.target),
      title: item.title,
      objectType: item.objectType,
      meta: item.meta,
      preview: item.blurb,
      categoryLabel: null,
      sourceLabel: "Favorite",
      updatedAt: item.createdAt,
      isFavorite: true,
      href: item.href,
      icon: item.objectType === "template" ? "list" as const : item.objectType === "prompt" ? "code" as const : "book" as const,
      visibility: null,
      ownedItem: null,
      favoriteTarget: item.target,
      membershipKeys: [favoriteLibraryItemKey(item.target)],
    })),
  ];

  return (
    <main className="my-page">
      <div className="my-wrap my-library-wrap">
        <div className="my-head library-page-head">
          <div>
            <Eyebrow>Your workspace</Eyebrow>
            <h1>My Library</h1>
            <p>Find any Template, Prompt, or Workflow in seconds.</p>
          </div>
          <div className="my-head-actions">
            <Link className="btn btn-primary btn-sm" href="/build">
              <Icon name="plus" size={14} /> New
            </Link>
          </div>
        </div>

        <LibraryBrowser
          items={browserItems}
          workspaces={workspaceData.workspaces}
          memberships={workspaceData.memberships}
          initialFilter={filter}
        />
      </div>
    </main>
  );
}

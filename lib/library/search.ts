export type LibrarySearchType = "all" | "template" | "prompt" | "workflow" | "favorite";
export type LibrarySort = "recent" | "name";

export type SearchableLibraryItem = {
  key: string;
  title: string;
  objectType: "template" | "prompt" | "workflow";
  meta: string;
  preview: string | null;
  categoryLabel: string | null;
  sourceLabel: string | null;
  updatedAt: string;
  isFavorite: boolean;
};

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

function rank(item: SearchableLibraryItem, query: string): number {
  if (!query) return 1;
  const title = normalize(item.title);
  const supporting = normalize([
    item.objectType,
    item.categoryLabel,
    item.sourceLabel,
    item.meta,
    item.preview,
  ].filter(Boolean).join(" "));
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  let score = 0;

  for (const token of tokens) {
    if (title === token) score += 120;
    else if (title.startsWith(token)) score += 80;
    else if (title.includes(token)) score += 48;
    else if (supporting.includes(token)) score += 16;
    else return 0;
  }
  return score;
}

export function searchLibrary<T extends SearchableLibraryItem>(
  items: T[],
  options: {
    query: string;
    type: LibrarySearchType;
    sort: LibrarySort;
    workspaceItemKeys?: ReadonlySet<string> | null;
  }
): T[] {
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    if (options.workspaceItemKeys && !options.workspaceItemKeys.has(item.key)) continue;
    if (options.type === "favorite" ? !item.isFavorite : options.type !== "all" && item.objectType !== options.type) continue;
    const score = rank(item, options.query);
    if (score > 0) scored.push({ item, score });
  }

  scored.sort((a, b) => {
    if (options.query && a.score !== b.score) return b.score - a.score;
    if (options.sort === "name") return a.item.title.localeCompare(b.item.title);
    return a.item.updatedAt < b.item.updatedAt ? 1 : -1;
  });
  return scored.map(({ item }) => item);
}

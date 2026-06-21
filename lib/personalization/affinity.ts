/* Pure category-affinity scoring for the "For you" sort. Derived from a user's OWN
 * library (bookmarks + saved prompts + their templates) — NOT from the anonymized
 * interaction events (which can't be tied to a user). Deterministic + unit-tested.
 * Weights: a created template > a saved prompt > a bookmark (rising intent). */

export type AffinityInput = {
  bookmarkCategories: string[];
  savedCategories: string[];
  templateCategories: string[];
};

export function computeAffinity(input: AffinityInput): Map<string, number> {
  const m = new Map<string, number>();
  const add = (cat: string | null | undefined, pts: number) => {
    if (!cat) return;
    m.set(cat, (m.get(cat) ?? 0) + pts);
  };
  for (const c of input.bookmarkCategories) add(c, 1);
  for (const c of input.savedCategories) add(c, 2);
  for (const c of input.templateCategories) add(c, 3);
  return m;
}

export function affinityScore(affinity: Map<string, number>, category: string): number {
  return affinity.get(category) ?? 0;
}

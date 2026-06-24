/* Pure publish-gate logic for saved Prompts — shared by setVisibilityAction and
 * unit tests (the action itself is server-only). A community Prompt may be
 * *published* only with real content and a category; draft/unlisted are exempt. */

import { CATEGORIES } from "@/data/templates";

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

/** A form value coerced to a known category id, or null. */
export function normalizeCategory(raw: unknown): string | null {
  return typeof raw === "string" && CATEGORY_IDS.has(raw) ? raw : null;
}

/** The reason a Prompt can't be published yet, or null when it may proceed. */
export function promptPublishError(body: string, category: string | null): string | null {
  if (!body.trim()) return "Add some content before publishing.";
  if (!category) return "Pick a category before publishing.";
  return null;
}

/* Pure public-visibility guard for saved Prompts. Public browse/filtering needs
 * real content and a category; private Prompts are exempt. */

import { CATEGORIES } from "@/data/templates";

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

/** A form value coerced to a known category id, or null. */
export function normalizeCategory(raw: unknown): string | null {
  return typeof raw === "string" && CATEGORY_IDS.has(raw) ? raw : null;
}

/** The reason a Prompt can't become public yet, or null when it may proceed. */
export function promptPublicVisibilityError(body: string, category: string | null): string | null {
  if (!body.trim()) return "Add some content before making this public.";
  if (!category) return "Pick a category before making this public.";
  return null;
}

/* Validation for bookmarks. Pure — shared by the toggle action, the client read
 * helper, and tests. A bookmark is a lightweight pointer to a catalog Template or
 * a curated example Prompt, saved to "My Library" (Favorites) for quick reuse
 * (distinct from saved_prompts, which store a user's composed answers). The
 * `target_kind`/`target_key` columns are plain text, so adding a kind needs no
 * migration. */

import { z } from "zod";

export const bookmarkTargetSchema = z.object({
  kind: z.enum(["catalog", "example_prompt"]),
  key: z.string().trim().min(1).max(120),
});

export type BookmarkTarget = z.infer<typeof bookmarkTargetSchema>;

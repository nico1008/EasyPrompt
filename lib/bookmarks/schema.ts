/* Validation for bookmarks. Pure — shared by the toggle action, the client read
 * helper, and tests. A bookmark is a lightweight pointer to a catalog template
 * saved to "My library" for quick reuse (distinct from saved_prompts, which
 * store a user's composed answers). target_kind reserves the extension path for
 * shared user content once the is_public sharing seam ships. */

import { z } from "zod";

export const bookmarkTargetSchema = z.object({
  kind: z.enum(["catalog"]),
  key: z.string().trim().min(1).max(120),
});

export type BookmarkTarget = z.infer<typeof bookmarkTargetSchema>;

/* Validation for prompt ratings. Pure — shared by the rate action, the client
 * read helpers, and unit tests. Ratings target the public catalog today
 * (target_kind 'catalog', target_key = slug); the enum reserves the extension
 * path for shared user content once the is_public sharing seam ships. */

import { z } from "zod";

export const ratingSchema = z
  .number()
  .int("Rating must be a whole number.")
  .min(1, "Rating must be 1–5.")
  .max(5, "Rating must be 1–5.");

export const targetKindSchema = z.enum(["catalog"]);

export const ratingTargetSchema = z.object({
  kind: targetKindSchema,
  key: z.string().trim().min(1).max(120),
});

export type RatingTarget = z.infer<typeof ratingTargetSchema>;

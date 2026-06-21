/* Validation for usage metrics ("Uses" = copies + open-ins; plus views as a
 * denominator). Pure — shared by the /api/track route, the client helpers, and
 * unit tests. Targets: the public catalog ('catalog'), curated example Prompts
 * ('example_prompt'), and — since community discovery (Phase 2) — published user
 * Prompts ('user_prompt') and Templates ('user_template'), both keyed by share_slug.
 * Reputation aggregates the user_* kinds. */

import { z } from "zod";

export const metricKindSchema = z.enum([
  "catalog",
  "example_prompt",
  "user_prompt",
  "user_template",
]);
export type MetricKind = z.infer<typeof metricKindSchema>;

export const metricTargetSchema = z.object({
  kind: metricKindSchema,
  key: z.string().trim().min(1).max(120),
});
export type MetricTarget = z.infer<typeof metricTargetSchema>;

export const metricActionSchema = z.enum([
  "copy",
  "open_chatgpt",
  "open_claude",
  "open_gemini",
  "view",
]);
export type MetricAction = z.infer<typeof metricActionSchema>;

/** The /api/track POST body: a target + action + the client session id. */
export const trackInputSchema = z.object({
  kind: metricKindSchema,
  key: z.string().trim().min(1).max(120),
  action: metricActionSchema,
  sid: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{32}$/, "Invalid session id."),
});
export type TrackInput = z.infer<typeof trackInputSchema>;

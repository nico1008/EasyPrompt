/* Validation for usage metrics ("Uses" = copies + open-ins; plus views as a
 * denominator). Pure — shared by the /api/track route, the client helpers, and
 * unit tests. Phase 1 targets the public catalog (kind 'catalog', key = slug) and
 * curated example Prompts (kind 'example_prompt', key = slug); the enum reserves
 * the extension path for user content when community discovery ships. */

import { z } from "zod";

export const metricKindSchema = z.enum(["catalog", "example_prompt"]);
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

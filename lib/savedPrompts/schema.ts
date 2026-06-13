/* Validation for saved prompt configs. Pure — shared by the server actions and
 * unit tests. The `answers` shape mirrors lib/buildPrompt.ts → Answers. */

import { z } from "zod";

export const answersSchema = z.object({
  fields: z.record(z.string(), z.string()),
  checks: z.record(z.string(), z.boolean()),
});

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Give it a name.")
  .max(120, "Keep the name under 120 characters.");

/** Size guards so a saved row can't be enormous. */
export const MAX_ANSWERS_JSON = 20_000;
export const MAX_GENERATED_TEXT = 50_000;

export type AnswersInput = z.infer<typeof answersSchema>;

/** Parse + size-check an answers JSON string. */
export function parseAnswers(
  raw: FormDataEntryValue | null
): { ok: true; value: AnswersInput } | { ok: false; error: string } {
  const s = typeof raw === "string" ? raw : "";
  if (s.length > MAX_ANSWERS_JSON) return { ok: false, error: "That's too much data to save." };
  let json: unknown;
  try {
    json = JSON.parse(s || "{}");
  } catch {
    return { ok: false, error: "Couldn't read your answers." };
  }
  const parsed = answersSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: "Those answers look malformed." };
  return { ok: true, value: parsed.data };
}

/* Hydrate a saved_prompts DB row's `answers` JSONB into the Builder's `Answers`
 * shape. Pure — no server-only imports — so it's usable on the server and in
 * tests. Mirrors lib/userTemplates/map.ts.
 *
 * Two integrity guarantees the raw `as Answers` cast didn't give us:
 *   1. The stored JSON is validated (answersSchema); malformed data falls back
 *      to a blank answer set instead of injecting garbage.
 *   2. Stale keys are pruned — only answers for fields/checkboxes that still
 *      exist on the resolved template survive, so a since-edited template can't
 *      replay values for fields it no longer has.
 *
 * The base is `blankAnswers` (not `defaultAnswers`): reopening a saved prompt
 * must show exactly what was stored — a field added to the template *after* the
 * save stays blank, never silently pre-selected to its authored default. */

import type { Database } from "@/lib/supabase/types";
import type { Template } from "@/data/types";
import { blankAnswers, type Answers } from "@/lib/buildPrompt";
import { answersSchema } from "./schema";

export type SavedPromptRow = Database["public"]["Tables"]["saved_prompts"]["Row"];

/** Build a clean `Answers` for `template` from a saved row's stored answers. */
export function rowToAnswers(row: Pick<SavedPromptRow, "answers">, template: Template): Answers {
  const base = blankAnswers(template);

  const parsed = answersSchema.safeParse(row.answers);
  if (!parsed.success) return base;

  const fieldIds = new Set(template.fields.map((f) => f.id));
  const checkIds = new Set(template.checkboxes.map((c) => c.id));

  const fields = { ...base.fields };
  for (const [id, value] of Object.entries(parsed.data.fields)) {
    if (fieldIds.has(id)) fields[id] = value;
  }
  const checks = { ...base.checks };
  for (const [id, value] of Object.entries(parsed.data.checks)) {
    if (checkIds.has(id)) checks[id] = value;
  }

  return { fields, checks };
}

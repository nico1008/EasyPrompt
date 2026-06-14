/* Pure helpers for the anonymous builder draft (autosave to localStorage).
 *
 * A "draft" is just an in-progress `Answers` for one template, persisted so a
 * refresh or accidental navigation doesn't wipe the user's work. No accounts
 * involved — this is the logged-out counterpart to saved_prompts. Pure and
 * SSR-agnostic so the serialize/parse logic is unit-testable; the React glue
 * lives in useDraft.ts. */

import { answersSchema, type AnswersInput } from "@/lib/savedPrompts/schema";
import type { Answers } from "@/lib/buildPrompt";

/** localStorage key for a template's draft. Namespaced + per-template. */
export function draftKey(templateId: string): string {
  return `easyprompt.draft.${templateId}`;
}

/** Cap so a single draft can't blow up storage (mirrors MAX_ANSWERS_JSON). */
export const MAX_DRAFT_JSON = 20_000;

/** Serialize answers for storage, or null if it's too big to keep. */
export function serializeDraft(answers: Answers): string | null {
  const json = JSON.stringify(answers);
  if (json.length > MAX_DRAFT_JSON) return null;
  return json;
}

/** Parse a stored draft string back into Answers. Corrupt/oversized → null. */
export function parseDraft(raw: string | null | undefined): AnswersInput | null {
  if (typeof raw !== "string" || !raw || raw.length > MAX_DRAFT_JSON) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = answersSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

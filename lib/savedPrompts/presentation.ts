import type { Database } from "@/lib/supabase/types";

type SavedPromptRow = Database["public"]["Tables"]["saved_prompts"]["Row"];
type SavedPromptSource = Pick<SavedPromptRow, "source_kind" | "body">;

export type SavedPromptEditMode = "answers" | "body" | "unavailable";

/**
 * Template-backed Prompts edit their answers while the source exists. Every
 * other Prompt edits its stored markdown body. A frozen body is also the safe
 * fallback when a source Template has been deleted.
 */
export function savedPromptEditMode(
  prompt: SavedPromptSource,
  hasSourceTemplate: boolean
): SavedPromptEditMode {
  const templateBacked = prompt.source_kind === "catalog" || prompt.source_kind === "user";
  if (templateBacked && hasSourceTemplate) return "answers";
  if (prompt.body !== null) return "body";
  return "unavailable";
}

/* The block document — the typed source the prompt builder edits and the
 * assembler (lib/buildPrompt.ts → buildPromptFromBlocks) consumes.
 *
 * A prompt is a list of reorderable, toggleable blocks. Each block contributes
 * (at most) one chunk of the assembled prompt, in document order. Four kinds:
 *   - `section`  : a heading + markdown body, shaped by `preset` (role/context/
 *                  task/…). The bulk of the taxonomy is presets over this kind.
 *   - `variable` : wraps a Field (data/types.ts) with an inline fill-in `value`,
 *                  so the same FieldControl + smart-exclusion rule apply.
 *   - `note`     : an author annotation — NEVER added to the assembled prompt.
 *   - `divider`  : a structural rule (`---`) between sections.
 *
 * A disabled block, an empty section, a blank variable, or any note is omitted
 * from the output — the "smart exclusion" rule lifted to the block level. */

import type { Field } from "@/data/types";

/** Section presets. Drive the label, starter content, icon and palette grouping.
 *  The first seven are the original set (kept stable for fromTemplate + tests). */
export type BlockPreset =
  // core
  | "role"
  | "task"
  | "context"
  | "instructions"
  | "constraints"
  | "output"
  // advanced
  | "persona"
  | "audience"
  | "tone"
  | "examples"
  | "cot"
  | "evaluation"
  | "knowledge"
  | "system_rules"
  | "tool_usage"
  // utility
  | "header"
  | "markdown";

/** Palette grouping for a block type. */
export type BlockCategory = "core" | "advanced" | "variables" | "utility";

type BlockCommon = {
  id: string;
  /** Off → omitted from the assembled prompt (smart exclusion). */
  enabled: boolean;
  /** UI-only: body hidden in the editor. Persisted so reopening remembers it. */
  collapsed: boolean;
};

export type SectionBlock = BlockCommon & {
  kind: "section";
  /** Drives the icon, default heading + starter text in the editor. */
  preset: BlockPreset;
  /** Emitted as `# {heading}` (muted, like a catalog base_prompt heading). */
  heading: string;
  /** Markdown body; its own `#` lines render muted in the code well. */
  body: string;
};

export type VariableBlock = BlockCommon & {
  kind: "variable";
  /** Reuses the catalog Field union (text/textarea/select/pills). */
  field: Field;
  /** Current fill-in. Blank → the block is skipped (smart exclusion). */
  value: string;
};

export type NoteBlock = BlockCommon & {
  kind: "note";
  /** Author-only annotation. Never added to the assembled prompt. */
  text: string;
};

export type DividerBlock = BlockCommon & {
  kind: "divider";
};

export type OptionalToggleBlock = BlockCommon & {
  kind: "optional_toggle";
  label: string;
  helper?: string;
  injectedText: string;
  suggestedSelected: boolean;
};

export type FormGroupBlock = BlockCommon & {
  kind: "form_group";
  title: string;
  description?: string;
};

export type Block = SectionBlock | VariableBlock | OptionalToggleBlock | FormGroupBlock | NoteBlock | DividerBlock;

export type BlockDoc = {
  version: 1;
  /** Prompt display name; maps to prompt_notebooks.name on save. */
  title: string;
  blocks: Block[];
  /** Creator metadata is carried in local drafts; canonical storage keeps it in columns. */
  outcome?: string;
  category?: string;
  icon?: string;
};

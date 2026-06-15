/* The block document — the typed source a notebook builder edits and the
 * notebook assembler (lib/buildPrompt.ts → buildPromptFromBlocks) consumes.
 *
 * A notebook is a list of reorderable, toggleable blocks. Each block contributes
 * one chunk of the assembled prompt, in document order. Two kinds:
 *   - `section`  : a heading + markdown body (role/context/task/constraints/
 *                  examples/output/free markdown — driven by `preset`).
 *   - `variable` : wraps a Field (data/types.ts) with an inline fill-in `value`,
 *                  so the same FieldControl + smart-exclusion rule apply.
 *
 * A disabled block, an empty section, or a blank variable is omitted from the
 * output — the "smart exclusion" rule lifted to the block level. */

import type { Field } from "@/data/types";

export type BlockPreset =
  | "role"
  | "context"
  | "task"
  | "constraints"
  | "examples"
  | "output"
  | "markdown";

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

export type Block = SectionBlock | VariableBlock;

export type BlockDoc = {
  version: 1;
  /** Notebook display name; maps to prompt_notebooks.name on save. */
  title: string;
  blocks: Block[];
};

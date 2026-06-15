/* Factories + starter content for new blocks. Pure (no UI imports — the
 * preset→icon mapping lives in the editor). The starter headings/bodies give a
 * new block a sensible, immediately-useful shape. */

import type { Field } from "@/data/types";
import type { Block, BlockDoc, BlockPreset, SectionBlock, VariableBlock } from "./types";

/** A fresh, collision-resistant block id. */
export function newBlockId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `b-${crypto.randomUUID()}`;
  }
  return `b-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Per-preset label + starter heading/body shown when a section block is added. */
export const PRESET_META: Record<
  BlockPreset,
  { label: string; heading: string; placeholder: string }
> = {
  role: {
    label: "Role",
    heading: "Role",
    placeholder: "You are a … . Describe the persona and expertise the model should adopt.",
  },
  context: {
    label: "Context",
    heading: "Context",
    placeholder: "Background the model needs: audience, situation, source material…",
  },
  task: {
    label: "Task",
    heading: "Task",
    placeholder: "What you want done, stated as a clear instruction.",
  },
  constraints: {
    label: "Constraints",
    heading: "Constraints",
    placeholder: "- Keep it under 200 words\n- Avoid jargon\n- Cite sources",
  },
  examples: {
    label: "Examples",
    heading: "Examples",
    placeholder: "Input → output pairs that show the model what good looks like.",
  },
  output: {
    label: "Output",
    heading: "Output format",
    placeholder: "How the response should be structured (sections, table, JSON…).",
  },
  markdown: {
    label: "Markdown",
    heading: "",
    placeholder: "Free-form markdown added verbatim to the prompt.",
  },
};

export const SECTION_PRESETS: BlockPreset[] = [
  "role",
  "context",
  "task",
  "constraints",
  "examples",
  "output",
  "markdown",
];

export function newSectionBlock(preset: BlockPreset): SectionBlock {
  return {
    id: newBlockId(),
    kind: "section",
    preset,
    heading: PRESET_META[preset].heading,
    body: "",
    enabled: true,
    collapsed: false,
  };
}

/** A new variable block. The prefix is derived from the label and kept in sync
 *  by the editor (derivePrefix), so assembly emits `# {label}\n{value}`. */
export function derivePrefix(label: string): string {
  const h = label.trim() || "Input";
  return `\n\n# ${h}\n`;
}

export function newVariableBlock(type: Field["type"] = "text"): VariableBlock {
  const label = "New input";
  const field: Field =
    type === "select" || type === "pills"
      ? { id: newBlockId(), type, label, prefix: derivePrefix(label), options: ["Option A", "Option B"] }
      : { id: newBlockId(), type, label, prefix: derivePrefix(label) };
  return {
    id: newBlockId(),
    kind: "variable",
    field,
    value: "",
    enabled: true,
    collapsed: false,
  };
}

export function newBlock(kind: "section" | "variable", preset: BlockPreset = "context"): Block {
  return kind === "section" ? newSectionBlock(preset) : newVariableBlock();
}

/** A blank notebook with one starter section, ready to edit. */
export function emptyBlockDoc(title = ""): BlockDoc {
  return { version: 1, title, blocks: [newSectionBlock("role")] };
}

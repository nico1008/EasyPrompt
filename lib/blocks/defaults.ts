/* Factories + starter content for new blocks, plus the palette catalogue the
 * "Add block" picker renders. Pure: the only import is the JSX-free IconName
 * type, so this stays usable from validators, actions, and tests. */

import type { Field } from "@/data/types";
import type { IconName } from "@/components/iconNames";
import type {
  Block,
  BlockCategory,
  BlockDoc,
  BlockPreset,
  DividerBlock,
  NoteBlock,
  SectionBlock,
  VariableBlock,
} from "./types";

/** A fresh, collision-resistant block id. */
export function newBlockId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `b-${crypto.randomUUID()}`;
  }
  return `b-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Per-preset metadata: label + starter heading/body + a one-line description
 *  (shown in the palette) + palette category. */
export const PRESET_META: Record<
  BlockPreset,
  { label: string; heading: string; placeholder: string; description: string; category: BlockCategory }
> = {
  // ---- core ----
  role: {
    label: "Role",
    heading: "Role",
    placeholder: "You are a … . Describe the persona and expertise the model should adopt.",
    description: "Who the AI should act as — its expertise and point of view.",
    category: "core",
  },
  task: {
    label: "Objective",
    heading: "Objective",
    placeholder: "State the single main thing you want done, as a clear instruction.",
    description: "The main goal — the one thing this prompt must accomplish.",
    category: "core",
  },
  context: {
    label: "Context",
    heading: "Context",
    placeholder: "Background the model needs: audience, situation, source material…",
    description: "Background and source material the model should know.",
    category: "core",
  },
  instructions: {
    label: "Instructions",
    heading: "Instructions",
    placeholder: "1. First…\n2. Then…\n3. Finally…",
    description: "Step-by-step instructions for carrying out the task.",
    category: "core",
  },
  constraints: {
    label: "Constraints",
    heading: "Constraints",
    placeholder: "- Keep it under 200 words\n- Avoid jargon\n- Cite sources",
    description: "Rules and limits the model must follow or avoid.",
    category: "core",
  },
  output: {
    label: "Output format",
    heading: "Output format",
    placeholder: "How the response should be structured (sections, table, JSON…).",
    description: "The shape of the response — sections, table, JSON, length.",
    category: "core",
  },
  // ---- advanced ----
  persona: {
    label: "Persona",
    heading: "Persona",
    placeholder: "Voice, character traits, and background that colour how it responds.",
    description: "A richer character beyond the core role.",
    category: "advanced",
  },
  audience: {
    label: "Audience",
    heading: "Audience",
    placeholder: "Who the output is for — their level, needs, and what they care about.",
    description: "Who will read the output, and what they need.",
    category: "advanced",
  },
  tone: {
    label: "Tone of voice",
    heading: "Tone",
    placeholder: "e.g. warm and plain-spoken; confident but never salesy.",
    description: "How the writing should feel — register and mood.",
    category: "advanced",
  },
  examples: {
    label: "Examples",
    heading: "Examples",
    placeholder: "Input → output pairs that show the model what good looks like.",
    description: "Few-shot examples that demonstrate the result you want.",
    category: "advanced",
  },
  cot: {
    label: "Reasoning steps",
    heading: "Reasoning",
    placeholder: "Think step by step: first …, then …, before giving the answer.",
    description: "Guide the model's reasoning before it answers.",
    category: "advanced",
  },
  evaluation: {
    label: "Evaluation criteria",
    heading: "Evaluation criteria",
    placeholder: "What a great answer must satisfy — the bar to hit.",
    description: "The criteria a strong answer must meet.",
    category: "advanced",
  },
  knowledge: {
    label: "Knowledge",
    heading: "Reference",
    placeholder: "Facts, definitions, or source text the model should rely on.",
    description: "Reference material to ground the answer in.",
    category: "advanced",
  },
  system_rules: {
    label: "System rules",
    heading: "System rules",
    placeholder: "Non-negotiable rules: stay on topic, refuse X, never reveal Y.",
    description: "Hard rules that always apply, whatever the request.",
    category: "advanced",
  },
  tool_usage: {
    label: "Tool usage",
    heading: "Tool usage",
    placeholder: "Which tools to use and when; how to call them and handle results.",
    description: "How and when to use tools or functions.",
    category: "advanced",
  },
  // ---- utility ----
  header: {
    label: "Section header",
    heading: "Section",
    placeholder: "Optional text under the heading.",
    description: "A standalone heading to group what follows.",
    category: "utility",
  },
  markdown: {
    label: "Custom text",
    heading: "",
    placeholder: "Free-form markdown added verbatim to the prompt.",
    description: "Any free-form markdown, added to the prompt as-is.",
    category: "utility",
  },
};

/** Section presets in palette order (grouped core → advanced → utility). */
export const SECTION_PRESETS: BlockPreset[] = [
  "role",
  "task",
  "context",
  "instructions",
  "constraints",
  "output",
  "persona",
  "audience",
  "tone",
  "examples",
  "cot",
  "evaluation",
  "knowledge",
  "system_rules",
  "tool_usage",
  "header",
  "markdown",
];

/** preset → icon. JSX-free (IconName is a string union), so it lives with the
 *  rest of the block data rather than in a component. */
export const PRESET_ICON: Record<BlockPreset, IconName> = {
  role: "teacher",
  task: "check",
  context: "letter",
  instructions: "list",
  constraints: "review",
  output: "chart",
  persona: "user",
  audience: "users",
  tone: "megaphone",
  examples: "lesson",
  cot: "share",
  evaluation: "scale",
  knowledge: "book",
  system_rules: "shield",
  tool_usage: "wrench",
  header: "heading",
  markdown: "code",
};

/* ----------------------------- factories ----------------------------- */

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

export function newNoteBlock(): NoteBlock {
  return { id: newBlockId(), kind: "note", text: "", enabled: true, collapsed: false };
}

export function newDividerBlock(): DividerBlock {
  return { id: newBlockId(), kind: "divider", enabled: true, collapsed: false };
}

/** A blank prompt with one starter section, ready to edit. */
export function emptyBlockDoc(title = ""): BlockDoc {
  return { version: 1, title, blocks: [newSectionBlock("role")] };
}

/* --------------------------- block type chrome --------------------------- */

const VAR_META: Record<Field["type"], { label: string; description: string }> = {
  text: { label: "Short text", description: "A one-line fill-in the reader replaces." },
  textarea: { label: "Long text", description: "A multi-line fill-in." },
  select: { label: "Dropdown", description: "Pick one option from a list." },
  pills: { label: "Choice pills", description: "Pick one from tappable options." },
};

/** Type chip label for a block in the editor / outline. */
export function blockTypeLabel(b: Block): string {
  switch (b.kind) {
    case "section":
      return PRESET_META[b.preset].label;
    case "variable":
      return "Variable";
    case "note":
      return "Note";
    case "divider":
      return "Divider";
  }
}

/** Type chip icon for a block. */
export function blockTypeIcon(b: Block): IconName {
  switch (b.kind) {
    case "section":
      return PRESET_ICON[b.preset];
    case "variable":
      return "zap";
    case "note":
      return "note";
    case "divider":
      return "minus";
  }
}

/* ------------------------------- palette --------------------------------- */

export type PaletteEntry = {
  /** Stable key for React lists + search. */
  key: string;
  label: string;
  description: string;
  icon: IconName;
  category: BlockCategory;
  /** Lower-cased haystack for search (label + description + synonyms). */
  keywords: string;
  /** Build a fresh block (new ids) to insert. */
  make: () => Block;
};

export const PALETTE_CATEGORIES: { id: BlockCategory; label: string }[] = [
  { id: "core", label: "Core" },
  { id: "advanced", label: "Advanced" },
  { id: "variables", label: "Variables" },
  { id: "utility", label: "Utility" },
];

/** The full catalogue the Add-block palette renders, in display order. */
export function paletteEntries(): PaletteEntry[] {
  const entries: PaletteEntry[] = [];

  for (const preset of SECTION_PRESETS) {
    const m = PRESET_META[preset];
    entries.push({
      key: `section:${preset}`,
      label: m.label,
      description: m.description,
      icon: PRESET_ICON[preset],
      category: m.category,
      keywords: `${m.label} ${m.description} ${preset}`.toLowerCase(),
      make: () => newSectionBlock(preset),
    });
  }

  (["text", "textarea", "select", "pills"] as Field["type"][]).forEach((type) => {
    const m = VAR_META[type];
    entries.push({
      key: `variable:${type}`,
      label: m.label,
      description: m.description,
      icon: "zap",
      category: "variables",
      keywords: `${m.label} ${m.description} input variable field ${type}`.toLowerCase(),
      make: () => newVariableBlock(type),
    });
  });

  entries.push({
    key: "note",
    label: "Note",
    description: "An author note — not added to the prompt.",
    icon: "note",
    category: "utility",
    keywords: "note comment annotation reminder",
    make: () => newNoteBlock(),
  });
  entries.push({
    key: "divider",
    label: "Divider",
    description: "A horizontal rule between sections.",
    icon: "minus",
    category: "utility",
    keywords: "divider rule separator line break",
    make: () => newDividerBlock(),
  });

  return entries;
}

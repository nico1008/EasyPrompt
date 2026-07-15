/* Zod schema + parse helpers for a BlockDoc. Pure — shared by the notebook
 * server actions, the anonymous draft layer (lib/drafts/notebookDraft.ts), and
 * unit tests. Mirrors lib/savedPrompts/schema.ts (parse + size cap + a stable
 * { ok, value } | { ok, error } result). The preset enum MUST mirror the
 * BlockPreset union in ./types (the project's keep-in-sync rule). */

import { z } from "zod";
import { idSchema, fieldSchema } from "@/lib/fields/schema";
import type { BlockDoc } from "./types";

export const blockPresetSchema = z.enum([
  // core
  "role",
  "task",
  "context",
  "instructions",
  "constraints",
  "output",
  // advanced
  "persona",
  "audience",
  "tone",
  "examples",
  "cot",
  "evaluation",
  "knowledge",
  "system_rules",
  "tool_usage",
  // utility
  "header",
  "markdown",
]);

const sectionBlockSchema = z.object({
  kind: z.literal("section"),
  id: idSchema,
  preset: blockPresetSchema,
  heading: z.string().max(200),
  body: z.string().max(8000),
  enabled: z.boolean(),
  collapsed: z.boolean(),
});

const variableBlockSchema = z.object({
  kind: z.literal("variable"),
  id: idSchema,
  field: fieldSchema,
  value: z.string().max(4000),
  enabled: z.boolean(),
  collapsed: z.boolean(),
});

const noteBlockSchema = z.object({
  kind: z.literal("note"),
  id: idSchema,
  text: z.string().max(8000),
  enabled: z.boolean(),
  collapsed: z.boolean(),
});

const dividerBlockSchema = z.object({
  kind: z.literal("divider"),
  id: idSchema,
  enabled: z.boolean(),
  collapsed: z.boolean(),
});

const optionalToggleBlockSchema = z.object({
  kind: z.literal("optional_toggle"),
  id: idSchema,
  label: z.string().max(80),
  helper: z.string().max(160).optional(),
  injectedText: z.string().max(1000),
  suggestedSelected: z.boolean(),
  enabled: z.boolean(),
  collapsed: z.boolean(),
});

const formGroupBlockSchema = z.object({
  kind: z.literal("form_group"),
  id: idSchema,
  title: z.string().max(80),
  description: z.string().max(200).optional(),
  enabled: z.boolean(),
  collapsed: z.boolean(),
});

export const blockSchema = z.discriminatedUnion("kind", [
  sectionBlockSchema,
  variableBlockSchema,
  optionalToggleBlockSchema,
  formGroupBlockSchema,
  noteBlockSchema,
  dividerBlockSchema,
]);

export const blockDocSchema = z.object({
  version: z.literal(1),
  title: z.string().max(120),
  blocks: z.array(blockSchema).max(60, "Keep it under 60 blocks."),
  outcome: z.string().max(240).optional(),
  category: z.string().max(40).optional(),
  icon: z.string().max(40).optional(),
});

export type BlockDocInput = z.infer<typeof blockDocSchema>;

/**
 * Structural validity is separate from saveability: the builder needs a valid
 * blank document while a user is starting, but the library must not accept an
 * artifact that cannot produce or collect useful input.
 */
export function blockDocSaveError(doc: BlockDoc): string | null {
  const hasReusableContent = doc.blocks.some((block) => {
    if (!block.enabled) return false;
    if (block.kind === "section") return block.body.trim().length > 0;
    if (block.kind === "variable") return block.field.label.trim().length > 0;
    if (block.kind === "optional_toggle") return block.label.trim().length > 0 && block.injectedText.trim().length > 0;
    return false;
  });

  return hasReusableContent
    ? null
    : "Add content or a reusable input before saving this Template.";
}

/** Size guard so a single prompt can't blow up storage / a row. */
export const MAX_NOTEBOOK_JSON = 50_000;

/** Validate a parsed object as a BlockDoc, enforcing unique block ids. */
export function validateBlockDoc(
  json: unknown
): { ok: true; value: BlockDoc } | { ok: false; error: string } {
  const parsed = blockDocSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: "That prompt looks malformed." };
  const ids = parsed.data.blocks.map((b) => b.id);
  if (new Set(ids).size !== ids.length)
    return { ok: false, error: "Block ids must be unique." };
  return { ok: true, value: parsed.data as BlockDoc };
}

/** Parse + size-check a block-doc JSON string (form field / column value). */
export function parseBlockDoc(
  raw: FormDataEntryValue | null
): { ok: true; value: BlockDoc } | { ok: false; error: string } {
  const s = typeof raw === "string" ? raw : "";
  if (s.length > MAX_NOTEBOOK_JSON) return { ok: false, error: "That prompt is too large to save." };
  let json: unknown;
  try {
    json = JSON.parse(s || "null");
  } catch {
    return { ok: false, error: "Couldn't read the prompt." };
  }
  return validateBlockDoc(json);
}

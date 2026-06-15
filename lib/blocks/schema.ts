/* Zod schema + parse helpers for a BlockDoc. Pure — shared by the notebook
 * server actions, the anonymous draft layer (lib/drafts/notebookDraft.ts), and
 * unit tests. Mirrors lib/savedPrompts/schema.ts (parse + size cap + a stable
 * { ok, value } | { ok, error } result). */

import { z } from "zod";
import { idSchema, fieldSchema } from "@/lib/fields/schema";
import type { BlockDoc } from "./types";

export const blockPresetSchema = z.enum([
  "role",
  "context",
  "task",
  "constraints",
  "examples",
  "output",
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

export const blockSchema = z.discriminatedUnion("kind", [
  sectionBlockSchema,
  variableBlockSchema,
]);

export const blockDocSchema = z.object({
  version: z.literal(1),
  title: z.string().max(120),
  blocks: z.array(blockSchema).max(60, "Keep it under 60 blocks."),
});

export type BlockDocInput = z.infer<typeof blockDocSchema>;

/** Size guard so a single notebook can't blow up storage / a row. */
export const MAX_NOTEBOOK_JSON = 50_000;

/** Validate a parsed object as a BlockDoc, enforcing unique block ids. */
export function validateBlockDoc(
  json: unknown
): { ok: true; value: BlockDoc } | { ok: false; error: string } {
  const parsed = blockDocSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: "That notebook looks malformed." };
  const ids = parsed.data.blocks.map((b) => b.id);
  if (new Set(ids).size !== ids.length)
    return { ok: false, error: "Block ids must be unique." };
  return { ok: true, value: parsed.data as BlockDoc };
}

/** Parse + size-check a notebook-doc JSON string (form field / column value). */
export function parseBlockDoc(
  raw: FormDataEntryValue | null
): { ok: true; value: BlockDoc } | { ok: false; error: string } {
  const s = typeof raw === "string" ? raw : "";
  if (s.length > MAX_NOTEBOOK_JSON) return { ok: false, error: "That notebook is too large to save." };
  let json: unknown;
  try {
    json = JSON.parse(s || "null");
  } catch {
    return { ok: false, error: "Couldn't read the notebook." };
  }
  return validateBlockDoc(json);
}

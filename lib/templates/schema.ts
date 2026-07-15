import { z } from "zod";
import { TEMPLATE_SCHEMA_VERSION, type TemplateDocument } from "./model";

export const TEMPLATE_LIMITS = {
  documentBytes: 50_000,
  blocks: 60,
  interactiveBlocks: 20,
  formGroups: 8,
  options: 12,
  label: 80,
  helper: 160,
  placeholder: 160,
  groupDescription: 200,
  contentBody: 8_000,
  prefixSuffix: 400,
  toggleText: 1_000,
  answer: 4_000,
  serializedAnswers: 20_000,
  savedPrompt: 20_000,
  compiledPrompt: 50_000,
  localDraftBudget: 2_000_000,
} as const;

const idSchema = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const common = { id: idSchema, enabled: z.boolean(), separate_from_previous: z.boolean().optional() };

const contentBlock = z.object({
  ...common,
  kind: z.literal("content"),
  purpose: z.enum(["instruction", "role", "context", "constraints", "example", "output"]),
  heading: z.string().max(120).optional(),
  body: z.string().max(TEMPLATE_LIMITS.contentBody),
});

const inputBlock = z.object({
  ...common,
  kind: z.literal("input"),
  input_type: z.enum(["short_text", "long_text", "single_choice"]),
  presentation: z.enum(["dropdown", "pills"]).optional(),
  label: z.string().max(TEMPLATE_LIMITS.label),
  helper: z.string().max(TEMPLATE_LIMITS.helper).optional(),
  placeholder: z.string().max(TEMPLATE_LIMITS.placeholder).optional(),
  required: z.boolean(),
  options: z.array(z.string().max(TEMPLATE_LIMITS.label)).max(TEMPLATE_LIMITS.options).optional(),
  prompt_prefix: z.string().max(TEMPLATE_LIMITS.prefixSuffix),
  prompt_suffix: z.string().max(TEMPLATE_LIMITS.prefixSuffix).optional(),
  suggested_answer: z.string().max(TEMPLATE_LIMITS.answer).optional(),
  group_id: idSchema.optional(),
});

const toggleBlock = z.object({
  ...common,
  kind: z.literal("optional_toggle"),
  label: z.string().max(TEMPLATE_LIMITS.label),
  helper: z.string().max(TEMPLATE_LIMITS.helper).optional(),
  injected_text: z.string().max(TEMPLATE_LIMITS.toggleText),
  suggested_selected: z.boolean().optional(),
  group_id: idSchema.optional(),
});

const noteBlock = z.object({
  ...common,
  kind: z.literal("note"),
  text: z.string().max(TEMPLATE_LIMITS.contentBody),
});

const dividerBlock = z.object({ ...common, kind: z.literal("divider") });

export const templateDocumentSchema = z.object({
  schema_version: z.literal(TEMPLATE_SCHEMA_VERSION),
  blocks: z
    .array(z.discriminatedUnion("kind", [contentBlock, inputBlock, toggleBlock, noteBlock, dividerBlock]))
    .max(TEMPLATE_LIMITS.blocks),
  form_groups: z
    .array(
      z.object({
        id: idSchema,
        title: z.string().trim().min(1).max(TEMPLATE_LIMITS.label),
        description: z.string().max(TEMPLATE_LIMITS.groupDescription).optional(),
      })
    )
    .max(TEMPLATE_LIMITS.formGroups),
});

export type TemplateDocumentParseResult =
  | { ok: true; value: TemplateDocument }
  | { ok: false; error: string; issues: z.core.$ZodIssue[] };

export function templateDocumentBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export function parseTemplateDocument(value: unknown): TemplateDocumentParseResult {
  if (templateDocumentBytes(value) > TEMPLATE_LIMITS.documentBytes) {
    return { ok: false, error: "Template document exceeds 50 KB.", issues: [] };
  }
  const result = templateDocumentSchema.safeParse(value);
  if (!result.success) {
    return { ok: false, error: "Template document is malformed.", issues: result.error.issues };
  }
  return { ok: true, value: result.data as TemplateDocument };
}

/* Validation for user-authored custom templates. Pure (no server-only / no
 * JSX imports) so server actions, the client editor, and unit tests all share
 * one source of truth. Mirrors the catalog invariants enforced in
 * tests/templates.test.ts (valid icon + category, unique field/checkbox ids,
 * builds to a non-empty prompt) and adds size caps to bound abuse/storage.
 *
 * Note: unlike the catalog authoring rule, we do NOT reject literal [BRACKET]
 * placeholders here — a user may legitimately want manual fill-ins in their own
 * prompt. The integrity bar is "builds to non-empty text". */

import { z } from "zod";
import { ICON_NAMES } from "@/components/iconNames";
import { CATEGORIES } from "@/data/templates";
import { buildPrompt, defaultAnswers } from "@/lib/buildPrompt";
import type { Template, Field, Checkbox } from "@/data/types";

const ICON_SET = new Set<string>(ICON_NAMES);
const CATEGORY_SET = new Set(CATEGORIES.map((c) => c.id));

const idSchema = z
  .string()
  .trim()
  .min(1, "id is required")
  .max(40, "id is too long")
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "Use letters, numbers, _ or - (no spaces).");

const fieldSchema = z
  .object({
    id: idSchema,
    type: z.enum(["text", "textarea", "select", "pills"]),
    label: z.string().trim().min(1, "Field label is required.").max(80),
    placeholder: z.string().max(160).optional(),
    helper: z.string().max(160).optional(),
    required: z.boolean().optional(),
    prefix: z.string().min(1, "Field prefix is required.").max(400),
    default: z.string().max(400).optional(),
    options: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  })
  .refine(
    (f) =>
      f.type === "text" || f.type === "textarea"
        ? true
        : Array.isArray(f.options) && f.options.length > 0,
    { message: "Select and pills fields need at least one option.", path: ["options"] }
  );

const checkboxSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1, "Checkbox label is required.").max(80),
  sub: z.string().max(160).optional(),
  injected_text: z.string().min(1, "Checkbox text is required.").max(1000),
  default: z.boolean().optional(),
});

export const userTemplateInputSchema = z.object({
  title: z.string().trim().min(1, "Give your template a title.").max(80),
  category: z.string().refine((c) => CATEGORY_SET.has(c), "Choose a valid category."),
  icon: z.string().refine((i) => ICON_SET.has(i), "Choose a valid icon."),
  tag: z.string().trim().max(24).optional(),
  blurb: z.string().trim().max(200).optional(),
  intro: z.string().trim().max(200).optional(),
  base_prompt: z.string().trim().min(1, "Write a base prompt.").max(4000),
  fields: z.array(fieldSchema).max(20, "Keep it under 20 fields."),
  checkboxes: z.array(checkboxSchema).max(20, "Keep it under 20 checkboxes."),
  is_public: z.boolean().optional(),
});

export type UserTemplateInput = z.infer<typeof userTemplateInputSchema>;

export type ValidationResult =
  | { ok: true; value: UserTemplateInput }
  | { ok: false; errors: string[] };

/** A throwaway Template built from an input — used for the "builds to text"
 *  check here and reused by the editor's live preview. */
export function inputToTemplate(input: UserTemplateInput): Template {
  return {
    id: "preview",
    slug: "preview",
    category: input.category,
    tag: input.tag ?? "",
    icon: input.icon as Template["icon"],
    seo_title: input.title,
    seo_description: input.blurb ?? "",
    blurb: input.blurb ?? "",
    intro: input.intro ?? "",
    uses: "",
    base_prompt: input.base_prompt,
    fields: input.fields as Field[],
    checkboxes: input.checkboxes as Checkbox[],
  };
}

export function validateUserTemplate(raw: unknown): ValidationResult {
  const parsed = userTemplateInputSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) =>
      i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message
    );
    return { ok: false, errors };
  }

  const value = parsed.data;
  const errors: string[] = [];

  const fieldIds = value.fields.map((f) => f.id);
  if (new Set(fieldIds).size !== fieldIds.length)
    errors.push("Field ids must be unique within a template.");
  const checkIds = value.checkboxes.map((c) => c.id);
  if (new Set(checkIds).size !== checkIds.length)
    errors.push("Checkbox ids must be unique within a template.");

  const tpl = inputToTemplate(value);
  const built = buildPrompt(tpl, defaultAnswers(tpl));
  if (built.text.trim().length === 0)
    errors.push("This template builds an empty prompt — add a base prompt or fields.");

  if (errors.length) return { ok: false, errors };
  return { ok: true, value };
}

/* Shared Zod schema for a single `Field` (data/types.ts → Field). Pure, no
 * server-only / JSX imports, so it's reused by user-template validation
 * (lib/userTemplates/validate.ts) and notebook block validation
 * (lib/blocks/schema.ts), and is unit-testable on its own. */

import { z } from "zod";

/** Stable id for a field/checkbox/block — letters, numbers, _ or - (no spaces). */
export const idSchema = z
  .string()
  .trim()
  .min(1, "id is required")
  .max(40, "id is too long")
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "Use letters, numbers, _ or - (no spaces).");

/** One form control — text/textarea (free input) or select/pills (option list). */
export const fieldSchema = z
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

export type FieldInput = z.infer<typeof fieldSchema>;

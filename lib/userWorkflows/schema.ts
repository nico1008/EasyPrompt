import { z } from "zod";
import { CATEGORIES } from "@/data/templates";
import type { Workflow } from "@/data/workflows";

export const WORKFLOW_DOCUMENT_VERSION = 1 as const;
const categoryIds = new Set(CATEGORIES.map((category) => category.id));

export const workflowLinkSchema = z.object({
  kind: z.enum(["catalog_template", "catalog_prompt", "user_template", "user_prompt"]),
  key: z.string().trim().min(1).max(120),
  titleSnapshot: z.string().trim().min(1).max(120),
  note: z.string().trim().max(240).optional(),
});

const inlinePromptSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().max(120),
  body: z.string().max(12000),
});

export const workflowStepSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().max(120),
  duration: z.string().trim().max(80),
  explanation: z.string().trim().max(1200),
  linkedItems: z.array(workflowLinkSchema).max(12).default([]),
  inlinePrompts: z.array(inlinePromptSchema).max(12).default([]),
  deliverables: z.array(z.string().trim().max(240)).max(30).default([]),
  tips: z.array(z.string().trim().max(400)).max(30).default([]),
});

export const workflowDocumentV1Schema = z.object({
  version: z.literal(WORKFLOW_DOCUMENT_VERSION),
  prerequisites: z.array(z.string().trim().max(300)).max(30),
  steps: z.array(workflowStepSchema).max(40),
});

export const workflowDraftSchema = z.object({
  title: z.string().trim().max(100),
  category: z.string().refine((value) => categoryIds.has(value), "Choose a valid category."),
  blurb: z.string().trim().max(300),
  overview: z.string().trim().max(2000),
  timeLabel: z.string().trim().max(100),
  document: workflowDocumentV1Schema,
});

export type WorkflowDocumentV1 = z.infer<typeof workflowDocumentV1Schema>;
export type WorkflowDraft = z.infer<typeof workflowDraftSchema>;
export type WorkflowLink = z.infer<typeof workflowLinkSchema>;

export function readWorkflowDocument(raw: unknown, version: number): WorkflowDocumentV1 {
  if (version !== WORKFLOW_DOCUMENT_VERSION) {
    throw new Error(`Unsupported Workflow document version: ${version}`);
  }
  return workflowDocumentV1Schema.parse(raw);
}

export function validateWorkflowDraft(raw: unknown) {
  return workflowDraftSchema.safeParse(raw);
}

export function validateWorkflowForPublish(raw: unknown): string[] {
  const parsed = workflowDraftSchema.safeParse(raw);
  if (!parsed.success) return parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  const value = parsed.data;
  const errors: string[] = [];
  if (!value.title) errors.push("Title is required.");
  if (!value.blurb) errors.push("Blurb is required.");
  if (!value.overview) errors.push("Overview is required.");
  if (!value.timeLabel) errors.push("Time label is required.");
  if (!value.document.steps.length) errors.push("Add at least one step.");
  const stepIds = value.document.steps.map((step) => step.id);
  if (new Set(stepIds).size !== stepIds.length) errors.push("Step ids must be unique.");
  for (const [index, step] of value.document.steps.entries()) {
    if (!step.title || !step.duration || !step.explanation) errors.push(`Step ${index + 1} is incomplete.`);
    const promptIds = step.inlinePrompts.map((prompt) => prompt.id);
    if (new Set(promptIds).size !== promptIds.length) errors.push(`Step ${index + 1} has duplicate inline prompt ids.`);
    if (step.inlinePrompts.some((prompt) => !prompt.title || !prompt.body.trim())) errors.push(`Step ${index + 1} has an incomplete inline prompt.`);
  }
  return errors;
}

export function catalogWorkflowToDraft(workflow: Workflow): WorkflowDraft {
  return {
    title: workflow.title,
    category: workflow.category,
    blurb: workflow.blurb,
    overview: workflow.overview,
    timeLabel: workflow.timeLabel,
    document: {
      version: 1,
      prerequisites: [...workflow.prerequisites],
      steps: workflow.steps.map((step) => ({
        ...step,
        id: crypto.randomUUID(),
        linkedItems: (step.linkedItems ?? []).map((item) => ({
          kind: item.type === "template" ? "catalog_template" as const : "catalog_prompt" as const,
          key: item.slug,
          titleSnapshot: item.slug,
          note: item.note,
        })),
        inlinePrompts: (step.inlinePrompts ?? []).map((prompt) => ({ ...prompt, id: crypto.randomUUID() })),
        deliverables: [...step.deliverables],
        tips: [...step.tips],
      })),
    },
  };
}

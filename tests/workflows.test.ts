import { describe, expect, it } from "vitest";
import { CATEGORIES, TEMPLATES } from "@/data/templates";
import { EXAMPLE_PROMPTS } from "@/data/prompts";
import { profileSchema } from "@/lib/auth/schemas";
import {
  WORKFLOWS,
  getWorkflow,
  isWorkflowLinkedItemValid,
  workflowCategories,
  workflowCountFor,
  workflowInlinePromptCount,
  workflowLinkedPromptCount,
  workflowStepCount,
  workflowTemplateCount,
  workflowToolMix,
} from "@/data/workflows";

const CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id));
const TEMPLATE_SLUGS = new Set(TEMPLATES.map((template) => template.slug));
const PROMPT_SLUGS = new Set(EXAMPLE_PROMPTS.map((prompt) => prompt.slug));

describe("WORKFLOWS integrity", () => {
  it("has unique ids and slugs", () => {
    const ids = WORKFLOWS.map((workflow) => workflow.id);
    const slugs = WORKFLOWS.map((workflow) => workflow.slug);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses valid categories", () => {
    for (const workflow of WORKFLOWS) {
      expect(CATEGORY_IDS.has(workflow.category), `${workflow.slug} category`).toBe(true);
    }
  });

  it("has non-empty required content", () => {
    for (const workflow of WORKFLOWS) {
      expect(workflow.title.trim().length, `${workflow.slug} title`).toBeGreaterThan(0);
      expect(workflow.blurb.trim().length, `${workflow.slug} blurb`).toBeGreaterThan(0);
      expect(workflow.overview.trim().length, `${workflow.slug} overview`).toBeGreaterThan(0);
      expect(workflow.timeLabel.trim().length, `${workflow.slug} time`).toBeGreaterThan(0);
      expect(workflow.prerequisites.length, `${workflow.slug} prereqs`).toBeGreaterThan(0);
      expect(workflow.steps.length, `${workflow.slug} steps`).toBeGreaterThan(0);

      for (const step of workflow.steps) {
        expect(step.title.trim().length, `${workflow.slug}/${step.id} title`).toBeGreaterThan(0);
        expect(step.duration.trim().length, `${workflow.slug}/${step.id} duration`).toBeGreaterThan(0);
        expect(step.explanation.trim().length, `${workflow.slug}/${step.id} explanation`).toBeGreaterThan(0);
        expect(step.deliverables.length, `${workflow.slug}/${step.id} deliverables`).toBeGreaterThan(0);
        expect(step.tips.length, `${workflow.slug}/${step.id} tips`).toBeGreaterThan(0);

        for (const inlinePrompt of step.inlinePrompts ?? []) {
          expect(inlinePrompt.title.trim().length, inlinePrompt.id).toBeGreaterThan(0);
          expect(inlinePrompt.body.trim().length, inlinePrompt.id).toBeGreaterThan(0);
        }
      }
    }
  });

  it("links only to real Templates and curated Prompts", () => {
    for (const workflow of WORKFLOWS) {
      for (const step of workflow.steps) {
        for (const item of step.linkedItems ?? []) {
          expect(isWorkflowLinkedItemValid(item), `${workflow.slug}/${step.id}/${item.slug}`).toBe(true);
          if (item.type === "template") {
            expect(TEMPLATE_SLUGS.has(item.slug)).toBe(true);
          } else {
            expect(PROMPT_SLUGS.has(item.slug)).toBe(true);
          }
        }
      }
    }
  });
});

describe("workflow helpers", () => {
  it("getWorkflow resolves by slug", () => {
    const first = WORKFLOWS[0];
    expect(getWorkflow(first.slug)?.id).toBe(first.id);
    expect(getWorkflow("__nope__")).toBeUndefined();
  });

  it("workflowCountFor('all') equals the catalog size and category counts sum to it", () => {
    expect(workflowCountFor("all")).toBe(WORKFLOWS.length);
    const sum = CATEGORIES.reduce((count, category) => count + workflowCountFor(category.id), 0);
    expect(sum).toBe(WORKFLOWS.length);
  });

  it("workflowCategories only returns categories that contain workflows", () => {
    for (const category of workflowCategories()) {
      expect(workflowCountFor(category.id)).toBeGreaterThan(0);
    }
  });

  it("counts steps, linked Templates, linked Prompts, and inline prompt text separately", () => {
    const workflow = getWorkflow("job-application-pack");
    expect(workflow).toBeDefined();
    if (!workflow) return;

    expect(workflowStepCount(workflow)).toBe(workflow.steps.length);
    expect(workflowTemplateCount(workflow)).toBeGreaterThan(0);
    expect(workflowLinkedPromptCount(workflow)).toBeGreaterThan(0);
    expect(workflowInlinePromptCount(workflow)).toBeGreaterThan(0);

    const mix = workflowToolMix(workflow);
    expect(mix.linkedPrompts).toBe(workflowLinkedPromptCount(workflow));
    expect(mix.inlinePrompts).toBe(workflowInlinePromptCount(workflow));
    expect(mix.label).toContain("linked Prompt");
    expect(mix.label).toContain("inline prompt");
  });
});

describe("workflow route safety", () => {
  it("reserves the workflows route from profile usernames", () => {
    expect(profileSchema.safeParse({ username: "workflows" }).success).toBe(false);
  });
});

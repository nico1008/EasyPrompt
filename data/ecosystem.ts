import { EXAMPLE_PROMPTS } from "@/data/prompts";
import { displayTitle, getTemplate, relatedTemplates } from "@/data/templates";
import { WORKFLOWS } from "@/data/workflows";

export type EcosystemLink = {
  kind: "template" | "prompt" | "workflow";
  title: string;
  href: string;
  note: string;
};

export function workflowsUsingTemplate(templateSlug: string): EcosystemLink[] {
  return WORKFLOWS.flatMap((workflow) =>
    workflow.steps.flatMap((step) =>
      (step.linkedItems ?? []).some(
        (item) => item.type === "template" && item.slug === templateSlug
      )
        ? [{
            kind: "workflow" as const,
            title: workflow.title,
            href: `/workflows/${workflow.slug}#step-${step.id}`,
            note: `Workflow · ${step.title}`,
          }]
        : []
    )
  );
}

export function workflowsUsingPrompt(promptSlug: string): EcosystemLink[] {
  return WORKFLOWS.flatMap((workflow) =>
    workflow.steps.flatMap((step) =>
      (step.linkedItems ?? []).some(
        (item) => item.type === "prompt" && item.slug === promptSlug
      )
        ? [{
            kind: "workflow" as const,
            title: workflow.title,
            href: `/workflows/${workflow.slug}#step-${step.id}`,
            note: `Workflow · ${step.title}`,
          }]
        : []
    )
  );
}

export function ecosystemLinksForTemplate(templateSlug: string): EcosystemLink[] {
  const examples = EXAMPLE_PROMPTS.filter(
    (prompt) => prompt.sourceTemplateSlug === templateSlug
  )
    .slice(0, 1)
    .map((prompt) => ({
      kind: "prompt" as const,
      title: prompt.title,
      href: `/prompts/${prompt.slug}`,
      note: "Ready-to-use example made from this Template",
    }));
  const workflows = workflowsUsingTemplate(templateSlug).slice(0, 2);
  const related = relatedTemplates(templateSlug, 1).flatMap((template) => {
    const current = getTemplate(templateSlug);
    if (!current || template.category !== current.category) return [];
    return [{
      kind: "template" as const,
      title: displayTitle(template),
      href: `/templates/${template.slug}`,
      note: "Related Template for the same category",
    }];
  });
  return [...examples, ...workflows, ...related];
}

export function ecosystemLinksForPrompt(promptSlug: string): EcosystemLink[] {
  return workflowsUsingPrompt(promptSlug).slice(0, 3);
}

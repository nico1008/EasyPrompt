import { getWorkflow } from "@/data/workflows";

export const WORKFLOW_QUERY_KEY = "workflow";
export const WORKFLOW_STEP_QUERY_KEY = "step";

export type WorkflowReturnContext = {
  workflowSlug: string;
  workflowTitle: string;
  stepId: string;
  stepTitle: string;
  stepNumber: number;
  stepCount: number;
  returnHref: string;
};

export function withWorkflowContext(
  href: string,
  workflowSlug: string,
  stepId: string
): string {
  const [pathname, hash = ""] = href.split("#", 2);
  const [base, query = ""] = pathname.split("?", 2);
  const params = new URLSearchParams(query);
  params.set(WORKFLOW_QUERY_KEY, workflowSlug);
  params.set(WORKFLOW_STEP_QUERY_KEY, stepId);
  const next = `${base}?${params.toString()}`;
  return hash ? `${next}#${hash}` : next;
}

export function resolveWorkflowContext(
  workflowSlug: string | undefined,
  stepId: string | undefined
): WorkflowReturnContext | null {
  if (!workflowSlug || !stepId) return null;
  const workflow = getWorkflow(workflowSlug);
  if (!workflow) return null;
  const stepNumber = workflow.steps.findIndex((step) => step.id === stepId);
  if (stepNumber < 0) return null;
  const step = workflow.steps[stepNumber];
  return {
    workflowSlug: workflow.slug,
    workflowTitle: workflow.title,
    stepId: step.id,
    stepTitle: step.title,
    stepNumber: stepNumber + 1,
    stepCount: workflow.steps.length,
    returnHref: `/workflows/${workflow.slug}#step-${step.id}`,
  };
}

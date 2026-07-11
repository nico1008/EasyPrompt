export type WorkflowProgress = {
  completedStepIds: string[];
  activeStepId: string | null;
};

export const EMPTY_WORKFLOW_PROGRESS: WorkflowProgress = {
  completedStepIds: [],
  activeStepId: null,
};

export function workflowProgressKey(workflowSlug: string): string {
  return `easyprompt.workflow-progress.${workflowSlug}`;
}

export function parseWorkflowProgress(
  raw: string | null,
  stepIds: string[]
): WorkflowProgress {
  if (!raw) return EMPTY_WORKFLOW_PROGRESS;
  try {
    const parsed = JSON.parse(raw) as Partial<WorkflowProgress>;
    const validIds = new Set(stepIds);
    const completedStepIds = Array.isArray(parsed.completedStepIds)
      ? [...new Set(parsed.completedStepIds.filter((id): id is string => typeof id === "string" && validIds.has(id)))]
      : [];
    const activeStepId =
      typeof parsed.activeStepId === "string" && validIds.has(parsed.activeStepId)
        ? parsed.activeStepId
        : null;
    return { completedStepIds, activeStepId };
  } catch {
    return EMPTY_WORKFLOW_PROGRESS;
  }
}

export function serializeWorkflowProgress(progress: WorkflowProgress): string {
  return JSON.stringify(progress);
}

export function firstIncompleteStepId(
  stepIds: string[],
  completedStepIds: string[]
): string | null {
  const completed = new Set(completedStepIds);
  return stepIds.find((id) => !completed.has(id)) ?? null;
}

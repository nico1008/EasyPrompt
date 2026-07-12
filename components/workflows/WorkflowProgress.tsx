"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "@/components/Icon";
import {
  EMPTY_WORKFLOW_PROGRESS,
  firstIncompleteStepId,
  parseWorkflowProgress,
  serializeWorkflowProgress,
  workflowProgressKey,
  type WorkflowProgress,
} from "@/lib/workflows/progress";

type WorkflowProgressContextValue = {
  progress: WorkflowProgress;
  stepIds: string[];
  hydrated: boolean;
  setActiveStep: (stepId: string) => void;
  toggleStep: (stepId: string) => void;
  goToStep: (stepId: string) => void;
  expandAll: boolean;
  setExpandAll: (expanded: boolean) => void;
};

const WorkflowProgressContext = createContext<WorkflowProgressContextValue | null>(null);

function scrollToStep(stepId: string) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document
    .getElementById(`step-${stepId}`)
    ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

export function WorkflowProgressProvider({
  workflowSlug,
  stepIds,
  children,
}: {
  workflowSlug: string;
  stepIds: string[];
  children: ReactNode;
}) {
  const [progress, setProgress] = useState<WorkflowProgress>(EMPTY_WORKFLOW_PROGRESS);
  const [hydrated, setHydrated] = useState(false);
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    try {
      setProgress(
        parseWorkflowProgress(
          window.localStorage.getItem(workflowProgressKey(workflowSlug)),
          stepIds
        )
      );
    } catch {
      setProgress(EMPTY_WORKFLOW_PROGRESS);
    }
    setHydrated(true);
  }, [stepIds, workflowSlug]);

  useEffect(() => {
    const hashStepId = window.location.hash.replace(/^#step-/, "");
    if (stepIds.includes(hashStepId)) {
      setProgress((current) => ({ ...current, activeStepId: hashStepId }));
    }
  }, [stepIds]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        workflowProgressKey(workflowSlug),
        serializeWorkflowProgress(progress)
      );
    } catch {
      // Progress remains usable for this visit when browser storage is unavailable.
    }
  }, [hydrated, progress, workflowSlug]);

  const setActiveStep = useCallback((stepId: string) => {
    setProgress((current) => ({ ...current, activeStepId: stepId }));
  }, []);

  const toggleStep = useCallback((stepId: string) => {
    setProgress((current) => {
      const completed = new Set(current.completedStepIds);
      if (completed.has(stepId)) completed.delete(stepId);
      else completed.add(stepId);
      return {
        completedStepIds: stepIds.filter((id) => completed.has(id)),
        activeStepId: stepId,
      };
    });
  }, [stepIds]);

  const goToStep = useCallback((stepId: string) => {
    setActiveStep(stepId);
    scrollToStep(stepId);
  }, [setActiveStep]);

  const value = useMemo(
    () => ({ progress, stepIds, hydrated, setActiveStep, toggleStep, goToStep, expandAll, setExpandAll }),
    [expandAll, goToStep, hydrated, progress, setActiveStep, stepIds, toggleStep]
  );

  return <WorkflowProgressContext.Provider value={value}>{children}</WorkflowProgressContext.Provider>;
}

function useWorkflowProgress() {
  const value = useContext(WorkflowProgressContext);
  if (!value) throw new Error("Workflow progress controls require WorkflowProgressProvider.");
  return value;
}

export function WorkflowProgressSummary() {
  const { progress, stepIds, hydrated, goToStep } = useWorkflowProgress();
  const completed = progress.completedStepIds.length;
  const nextId = firstIncompleteStepId(stepIds, progress.completedStepIds);
  const targetId = nextId ?? progress.activeStepId ?? stepIds[0];
  const done = completed === stepIds.length;
  const label = done ? "Review" : completed > 0 ? "Resume" : "Start";

  return (
    <div className="wd-progress-summary" aria-live="polite">
      <span className="wd-progress-copy">
        <strong>{hydrated ? `${completed} of ${stepIds.length}` : `0 of ${stepIds.length}`}</strong>
        <span>{hydrated && done ? "Workflow complete" : "steps complete"}</span>
      </span>
      <span className="wd-progress-track" aria-hidden="true">
        <span style={{ width: `${stepIds.length ? (completed / stepIds.length) * 100 : 0}%` }} />
      </span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => targetId && goToStep(targetId)}>
        {label} <Icon name="arrow-right" size={13} />
      </button>
    </div>
  );
}

export function WorkflowDisclosureControls() {
  const { expandAll, setExpandAll } = useWorkflowProgress();
  return (
    <div className="wd-disclosure-controls">
      <span>Focus on one step at a time</span>
      <button type="button" onClick={() => setExpandAll(!expandAll)} aria-pressed={expandAll}>
        {expandAll ? "Collapse all" : "Expand all"}
      </button>
    </div>
  );
}

export function WorkflowStep({
  stepId,
  stepNumber,
  duration,
  title,
  explanation,
  children,
}: {
  stepId: string;
  stepNumber: number;
  duration: string;
  title: string;
  explanation: string;
  children: ReactNode;
}) {
  const { progress, stepIds, expandAll } = useWorkflowProgress();
  const [expanded, setExpanded] = useState(false);
  const activeStepId = progress.activeStepId ?? stepIds[0];
  const active = activeStepId === stepId;
  const open = expandAll || active || expanded;
  const bodyId = `step-${stepId}-body`;

  return (
    <article
      className={`wd-step${active ? " is-active" : ""}${open ? " is-expanded" : ""}`}
      id={`step-${stepId}`}
    >
      <div className="wd-step-marker" aria-hidden="true">{stepNumber}</div>
      <div className="wd-step-main">
        <div className="wd-step-head">
          <div>
            <span>{duration}</span>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="wd-step-toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            disabled={active || expandAll}
            onClick={() => setExpanded((value) => !value)}
          >
            {active ? "Current step" : expandAll ? "Expanded" : expanded ? "Hide step" : "Open step"}
            <Icon name={open ? "minus" : "plus"} size={14} />
          </button>
        </div>
        <div className="wd-step-body" id={bodyId}>
          <p className="wd-step-copy">{explanation}</p>
          {children}
        </div>
      </div>
    </article>
  );
}

export function WorkflowStepAction({ stepId, stepNumber }: { stepId: string; stepNumber: number }) {
  const { progress, hydrated, setActiveStep, toggleStep } = useWorkflowProgress();
  const complete = progress.completedStepIds.includes(stepId);
  return (
    <div className="wd-step-action">
      <button
        type="button"
        className={`wd-complete${complete ? " is-complete" : ""}`}
        aria-pressed={complete}
        disabled={!hydrated}
        onFocus={() => setActiveStep(stepId)}
        onClick={() => toggleStep(stepId)}
      >
        <Icon name={complete ? "check" : "plus"} size={14} />
        {complete ? `Step ${stepNumber} complete` : `Mark step ${stepNumber} complete`}
      </button>
    </div>
  );
}

export function WorkflowMobileProgress() {
  const { progress, stepIds, hydrated, goToStep } = useWorkflowProgress();
  const nextId = firstIncompleteStepId(stepIds, progress.completedStepIds);
  const targetId = nextId ?? progress.activeStepId ?? stepIds[0];
  return (
    <div className="wd-mobile-progress">
      <span>{hydrated ? progress.completedStepIds.length : 0}/{stepIds.length} complete</span>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => targetId && goToStep(targetId)}>
        {nextId ? "Next unfinished" : "Review steps"}
      </button>
    </div>
  );
}

export function WorkflowCardProgress({ workflowSlug, stepIds }: { workflowSlug: string; stepIds: string[] }) {
  const [completed, setCompleted] = useState(0);
  useEffect(() => {
    try {
      setCompleted(
        parseWorkflowProgress(
          window.localStorage.getItem(workflowProgressKey(workflowSlug)),
          stepIds
        ).completedStepIds.length
      );
    } catch {
      setCompleted(0);
    }
  }, [stepIds, workflowSlug]);
  if (completed === 0) return null;
  return (
    <span className="wt-progress">
      <Icon name="check" size={11} /> {completed === stepIds.length ? "Complete" : `${completed}/${stepIds.length} complete`}
    </span>
  );
}

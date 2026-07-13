"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "@/components/Icon";

type WorkflowStepsContextValue = {
  anchoredStepId: string | null;
  expandAll: boolean;
  setExpandAll: (expanded: boolean) => void;
};

const WorkflowStepsContext = createContext<WorkflowStepsContextValue | null>(null);

export function WorkflowStepsProvider({
  stepIds,
  children,
}: {
  stepIds: string[];
  children: ReactNode;
}) {
  const [anchoredStepId, setAnchoredStepId] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    const hashStepId = window.location.hash.replace(/^#step-/, "");
    setAnchoredStepId(stepIds.includes(hashStepId) ? hashStepId : null);
  }, [stepIds]);

  const value = useMemo(
    () => ({ anchoredStepId, expandAll, setExpandAll }),
    [anchoredStepId, expandAll]
  );

  return <WorkflowStepsContext.Provider value={value}>{children}</WorkflowStepsContext.Provider>;
}

function useWorkflowSteps() {
  const value = useContext(WorkflowStepsContext);
  if (!value) throw new Error("Workflow step controls require WorkflowStepsProvider.");
  return value;
}

export function WorkflowDisclosureControls() {
  const { expandAll, setExpandAll } = useWorkflowSteps();
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
  const { anchoredStepId, expandAll } = useWorkflowSteps();
  const [expanded, setExpanded] = useState(false);
  const isInitialStep = anchoredStepId ? anchoredStepId === stepId : stepNumber === 1;
  const open = expandAll || isInitialStep || expanded;
  const bodyId = `step-${stepId}-body`;

  return (
    <article className={`wd-step${open ? " is-expanded" : ""}`} id={`step-${stepId}`}>
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
            disabled={isInitialStep || expandAll}
            onClick={() => setExpanded((value) => !value)}
          >
            {isInitialStep ? "Opened" : expandAll ? "Expanded" : expanded ? "Hide step" : "Open step"}
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

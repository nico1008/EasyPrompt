import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { WorkflowReturnContext } from "@/lib/workflows/context";

export function WorkflowContextBar({ context }: { context: WorkflowReturnContext }) {
  return (
    <aside className="workflow-context" aria-label="Workflow context">
      <span className="workflow-context-mark" aria-hidden="true">
        <Icon name="book" size={14} />
      </span>
      <span className="workflow-context-copy">
        <strong>{context.workflowTitle}</strong>
        <span>
          Step {context.stepNumber} of {context.stepCount}: {context.stepTitle}
        </span>
      </span>
      <Link className="workflow-context-return" href={context.returnHref}>
        Return to Workflow <Icon name="arrow-right" size={14} />
      </Link>
    </aside>
  );
}

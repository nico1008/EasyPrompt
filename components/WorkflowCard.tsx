import Link from "next/link";
import { Icon } from "@/components/Icon";
import {
  workflowCategoryLabel,
  workflowStepCount,
  workflowToolMix,
  type Workflow,
} from "@/data/workflows";

export function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const mix = workflowToolMix(workflow);

  return (
    <article className={`workflow-tile${workflow.popular ? " popular" : ""}`}>
      <div className="wt-bar">
        <span className="wt-glyph" aria-hidden="true">
          <Icon name="book" size={14} />
        </span>
        <h3 className="wt-name">
          <Link className="wt-namelink" href={`/workflows/${workflow.slug}`}>
            {workflow.title}
          </Link>
        </h3>
        {workflow.popular && (
          <span className="wt-pop" title="Popular workflow" aria-label="Popular workflow">
            <Icon name="star" size={12} />
          </span>
        )}
      </div>

      <div className="wt-body">
        <span className="wt-category">{workflowCategoryLabel(workflow.category)}</span>
        <p>{workflow.blurb}</p>
      </div>

      <div className="wt-foot">
        <span>{workflowStepCount(workflow)} steps</span>
        <span>{workflow.timeLabel}</span>
      </div>
      <div className="wt-mix">{mix.label}</div>
    </article>
  );
}

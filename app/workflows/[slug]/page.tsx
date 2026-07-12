import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../workflows.css";
import { Icon } from "@/components/Icon";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { WorkflowInlinePrompt } from "@/components/WorkflowInlinePrompt";
import {
  WorkflowMobileProgress,
  WorkflowDisclosureControls,
  WorkflowProgressProvider,
  WorkflowProgressSummary,
  WorkflowStep,
  WorkflowStepAction,
} from "@/components/workflows/WorkflowProgress";
import {
  WORKFLOWS,
  getWorkflow,
  resolveWorkflowLinkedItem,
  workflowCategoryLabel,
  workflowStepCount,
  workflowToolMix,
  type WorkflowLinkedItem,
  type WorkflowLinkedItemDetail,
} from "@/data/workflows";
import { withWorkflowContext } from "@/lib/workflows/context";

export function generateStaticParams() {
  return WORKFLOWS.map((workflow) => ({ slug: workflow.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const workflow = getWorkflow(slug);
  if (!workflow) return { title: "Workflow not found" };

  return {
    title: workflow.seoTitle,
    description: workflow.seoDescription,
    alternates: { canonical: `/workflows/${workflow.slug}` },
    openGraph: {
      title: workflow.seoTitle,
      description: workflow.seoDescription,
      url: `/workflows/${workflow.slug}`,
      type: "website",
    },
  };
}

function linkedItemDetail(item: WorkflowLinkedItem): WorkflowLinkedItemDetail {
  const detail = resolveWorkflowLinkedItem(item);
  if (!detail) {
    throw new Error(`Invalid workflow linked item: ${item.type}:${item.slug}`);
  }
  return detail;
}

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workflow = getWorkflow(slug);
  if (!workflow) notFound();

  const mix = workflowToolMix(workflow);

  const stepIds = workflow.steps.map((step) => step.id);

  return (
    <WorkflowProgressProvider workflowSlug={workflow.slug} stepIds={stepIds}>
    <main className="workflow-detail">
      <div className="wd-wrap">
        <div className="wd-topbar">
          <Breadcrumbs
            items={[
              { href: "/workflows", label: "Workflows" },
              { label: workflow.title },
            ]}
          />
        </div>

        <section className="wd-head">
          <div>
            <span className="wd-tag">{workflowCategoryLabel(workflow.category)}</span>
            <h1>{workflow.title}</h1>
            <p>{workflow.overview}</p>
          </div>
          <aside className="wd-summary" aria-label="Workflow summary">
            <span>
              <Icon name="list" size={15} />
              {workflowStepCount(workflow)} steps
            </span>
            <span>
              <Icon name="clock" size={15} />
              {workflow.timeLabel}
            </span>
            <span>
              <Icon name="book" size={15} />
              {mix.label}
            </span>
            <WorkflowProgressSummary />
          </aside>
        </section>

        <section className="wd-prereqs" aria-labelledby="workflow-prereqs">
          <h2 id="workflow-prereqs">Before you start</h2>
          <ul>
            {workflow.prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="wd-steps" aria-label="Workflow steps">
          <WorkflowDisclosureControls />
          {workflow.steps.map((step, index) => {
            const linkedItems = (step.linkedItems ?? []).map(linkedItemDetail);
            return (
              <WorkflowStep
                key={step.id}
                stepId={step.id}
                stepNumber={index + 1}
                duration={step.duration}
                title={step.title}
                explanation={step.explanation}
              >

                  {linkedItems.length > 0 && (
                    <div className="wd-linked" aria-label="Linked Templates and Prompts">
                      {linkedItems.map((item) => (
                        <Link
                          key={`${item.type}-${item.slug}`}
                          className={`wd-linked-card is-${item.type}`}
                          href={withWorkflowContext(item.href, workflow.slug, step.id)}
                        >
                          <span className="wd-linked-icon" aria-hidden="true">
                            <Icon name={item.type === "template" ? "list" : "code"} size={15} />
                          </span>
                          <span className="wd-linked-text">
                            <span>{item.label}</span>
                            <strong>{item.title}</strong>
                            {item.note && <small>{item.note}</small>}
                          </span>
                          <Icon name="arrow-right" size={14} />
                        </Link>
                      ))}
                    </div>
                  )}

                  {step.inlinePrompts?.map((prompt) => (
                    <WorkflowInlinePrompt key={prompt.id} prompt={prompt} />
                  ))}

                  <div className="wd-step-lists">
                    <div>
                      <h3>Deliverables</h3>
                      <ul>
                        {step.deliverables.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3>Tips</h3>
                      <ul>
                        {step.tips.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <WorkflowStepAction stepId={step.id} stepNumber={index + 1} />
              </WorkflowStep>
            );
          })}
        </section>
      </div>
      <WorkflowMobileProgress />
    </main>
    </WorkflowProgressProvider>
  );
}

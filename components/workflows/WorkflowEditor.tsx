"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { CATEGORIES } from "@/data/templates";
import { createWorkflowAction, updateWorkflowAction, type WorkflowActionState } from "@/lib/userWorkflows/actions";
import type { WorkflowDocumentV1, WorkflowDraft, WorkflowLink } from "@/lib/userWorkflows/schema";

const emptyDocument = (): WorkflowDocumentV1 => ({ version: 1, prerequisites: [], steps: [] });
const emptyStep = (): WorkflowDocumentV1["steps"][number] => ({
  id: crypto.randomUUID(), title: "", duration: "", explanation: "", linkedItems: [], inlinePrompts: [], deliverables: [], tips: [],
});
const lines = (value: string) => value.split("\n");
const linkLabels: Record<WorkflowLink["kind"], string> = {
  catalog_template: "Catalog Template",
  catalog_prompt: "Catalog Prompt",
  user_template: "Community Template",
  user_prompt: "Community Prompt",
};

export type WorkflowEditorInitial = WorkflowDraft & { id: string; revision: number };

export function WorkflowEditor({ initial }: { initial?: WorkflowEditorInitial }) {
  const router = useRouter();
  const [draft, setDraft] = useState<WorkflowDraft>(initial ?? { title: "", category: CATEGORIES[0].id, blurb: "", overview: "", timeLabel: "", document: emptyDocument() });
  const [revision, setRevision] = useState(initial?.revision ?? 1);
  const [dirty, setDirty] = useState(false);
  const action = initial ? updateWorkflowAction : createWorkflowAction;
  const [state, submit, pending] = useActionState<WorkflowActionState, FormData>(action, {});
  const storageKey = `easyprompt.workflow-editor.${initial?.id ?? "new"}`;

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) try { setDraft(JSON.parse(raw)); } catch { /* Ignore a malformed local draft. */ }
  }, [storageKey]);
  useEffect(() => { if (dirty) localStorage.setItem(storageKey, JSON.stringify(draft)); }, [dirty, draft, storageKey]);
  useEffect(() => {
    if (!state.ok) return;
    localStorage.removeItem(storageKey);
    setDirty(false);
    if (!initial && state.id) router.replace(`/my/workflows/${state.id}/edit`);
    if (state.revision) setRevision(state.revision);
  }, [initial, router, state, storageKey]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  const status = useMemo(() => pending ? "Saving…" : state.conflict ? "Newer changes exist" : state.errors?.[0] ?? (state.ok ? "Saved" : dirty ? "Unsaved changes" : "Saved"), [dirty, pending, state]);
  const set = <K extends keyof WorkflowDraft>(key: K, value: WorkflowDraft[K]) => { setDraft((current) => ({ ...current, [key]: value })); setDirty(true); };
  const setDocument = (document: WorkflowDocumentV1) => set("document", document);
  const updateStep = (index: number, patch: Partial<WorkflowDocumentV1["steps"][number]>) => {
    const steps = [...draft.document.steps];
    steps[index] = { ...steps[index], ...patch };
    setDocument({ ...draft.document, steps });
  };
  const addStep = () => {
    const step = emptyStep();
    setDocument({ ...draft.document, steps: [...draft.document.steps, step] });
    requestAnimationFrame(() => document.getElementById(`edit-step-${step.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const move = (index: number, direction: -1 | 1) => {
    const steps = [...draft.document.steps];
    const next = index + direction;
    if (next < 0 || next >= steps.length) return;
    [steps[index], steps[next]] = [steps[next], steps[index]];
    setDocument({ ...draft.document, steps });
  };

  return (
    <main className="workflow-editor-page">
      <form action={submit} className="workflow-editor">
        <input type="hidden" name="id" value={initial?.id ?? ""} />
        <input type="hidden" name="revision" value={revision} />
        <input type="hidden" name="payload" value={JSON.stringify(draft)} />

        <header className="we-topbar">
          <div className="we-title-block">
            <span className="we-product-mark"><Icon name="book" size={16} /> Workflow builder</span>
            <h1>{initial ? draft.title || "Untitled Workflow" : "New Workflow"}</h1>
          </div>
          <div className="we-save-cluster">
            <span className={`we-save-status${dirty ? " is-dirty" : ""}${state.conflict ? " is-error" : ""}`} aria-live="polite">
              <span aria-hidden="true" />{status}
            </span>
            <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save Workflow"}</button>
          </div>
        </header>

        <div className="we-shell">
          <aside className="we-outline" aria-label="Workflow structure">
            <div className="we-outline-head">
              <span>Structure</span>
              <strong>{draft.document.steps.length} {draft.document.steps.length === 1 ? "step" : "steps"}</strong>
            </div>
            <nav>
              <a href="#workflow-details"><Icon name="heading" size={15} />Details</a>
              <a href="#workflow-prerequisites"><Icon name="check" size={15} />Preparation</a>
              {draft.document.steps.map((step, index) => (
                <a href={`#edit-step-${step.id}`} key={step.id} className="we-outline-step">
                  <span>{index + 1}</span><span>{step.title || `Untitled step ${index + 1}`}</span>
                </a>
              ))}
            </nav>
            <button type="button" className="we-add-outline" onClick={addStep}><Icon name="plus" size={15} />Add step</button>
            <p>Drafts stay on this device until you save.</p>
          </aside>

          <div className="we-canvas">
            <section className="we-section" id="workflow-details" aria-labelledby="workflow-details-title">
              <div className="we-section-heading">
                <div><span className="we-section-number">01</span><h2 id="workflow-details-title">Workflow details</h2></div>
                <p>Set the context people need before they begin.</p>
              </div>
              <div className="we-fields-grid">
                <label className="we-field we-field-wide"><span>Title</span><input className="input" value={draft.title} onChange={(event) => set("title", event.target.value)} maxLength={100} placeholder="e.g. Launch a product update" /></label>
                <label className="we-field"><span>Category</span><select className="select" value={draft.category} onChange={(event) => set("category", event.target.value)}>{CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
                <label className="we-field"><span>Time estimate</span><input className="input" value={draft.timeLabel} onChange={(event) => set("timeLabel", event.target.value)} maxLength={100} placeholder="e.g. 30 min active work" /></label>
                <label className="we-field we-field-wide"><span>Short description</span><textarea className="textarea we-textarea-short" value={draft.blurb} onChange={(event) => set("blurb", event.target.value)} maxLength={300} placeholder="A concise description for Workflow cards and listings." /><small>{draft.blurb.length}/300</small></label>
                <label className="we-field we-field-wide"><span>Overview</span><textarea className="textarea" value={draft.overview} onChange={(event) => set("overview", event.target.value)} maxLength={2000} placeholder="Explain the outcome, when to use this Workflow, and what a successful run produces." /><small>{draft.overview.length}/2000</small></label>
              </div>
            </section>

            <section className="we-section" id="workflow-prerequisites" aria-labelledby="workflow-prerequisites-title">
              <div className="we-section-heading">
                <div><span className="we-section-number">02</span><h2 id="workflow-prerequisites-title">Before you start</h2></div>
                <p>List the inputs or decisions someone should have ready.</p>
              </div>
              <label className="we-field"><span>Prerequisites</span><textarea className="textarea" value={draft.document.prerequisites.join("\n")} onChange={(event) => setDocument({ ...draft.document, prerequisites: lines(event.target.value) })} placeholder={"One item per line\nResearch notes\nAudience and goal"} /><small>One item per line</small></label>
            </section>

            <section className="we-steps-section" aria-labelledby="workflow-steps-title">
              <div className="we-steps-heading"><div><span className="we-section-number">03</span><h2 id="workflow-steps-title">Steps</h2><p>Build the playbook in the order it should be completed.</p></div><button type="button" className="btn btn-ghost btn-sm" onClick={addStep}><Icon name="plus" size={14} />Add step</button></div>

              {draft.document.steps.length === 0 && (
                <div className="we-empty">
                  <span><Icon name="list" size={20} /></span><h3>Start with the first step</h3><p>Each step can include linked Templates, linked Prompts, and inline prompt text.</p><button type="button" className="btn btn-primary btn-sm" onClick={addStep}><Icon name="plus" size={14} />Add first step</button>
                </div>
              )}

              {draft.document.steps.map((step, index) => (
                <fieldset className="we-step" id={`edit-step-${step.id}`} key={step.id}>
                  <legend>Step {index + 1}</legend>
                  <div className="we-step-toolbar">
                    <div><span className="we-step-index">{String(index + 1).padStart(2, "0")}</span><strong>{step.title || "Untitled step"}</strong></div>
                    <div className="we-order">
                      <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move step ${index + 1} up`}>↑</button>
                      <button type="button" disabled={index === draft.document.steps.length - 1} onClick={() => move(index, 1)} aria-label={`Move step ${index + 1} down`}>↓</button>
                      <button type="button" className="we-remove-icon" aria-label={`Remove step ${index + 1}`} onClick={() => { if (confirm("Remove this step?")) setDocument({ ...draft.document, steps: draft.document.steps.filter((_, itemIndex) => itemIndex !== index) }); }}><Icon name="trash" size={15} /></button>
                    </div>
                  </div>

                  <div className="we-step-fields">
                    <label className="we-field"><span>Step title</span><input className="input" value={step.title} onChange={(event) => updateStep(index, { title: event.target.value })} placeholder="Name the outcome of this step" /></label>
                    <label className="we-field"><span>Time estimate</span><input className="input" value={step.duration} onChange={(event) => updateStep(index, { duration: event.target.value })} placeholder="e.g. 8 min active work" /></label>
                    <label className="we-field we-field-wide"><span>Instructions</span><textarea className="textarea we-textarea-short" value={step.explanation} onChange={(event) => updateStep(index, { explanation: event.target.value })} placeholder="What should someone do, and why does it matter?" /></label>
                  </div>

                  <div className="we-resource-group">
                    <div className="we-resource-head"><div><Icon name="book" size={16} /><span><strong>Linked content</strong><small>Open a Template or Prompt in context</small></span></div><button type="button" onClick={() => updateStep(index, { linkedItems: [...step.linkedItems, { kind: "catalog_template", key: "", titleSnapshot: "" }] })}><Icon name="plus" size={14} />Link content</button></div>
                    {step.linkedItems.length === 0 ? <p className="we-resource-empty">No linked Templates or Prompts in this step.</p> : step.linkedItems.map((link, linkIndex) => (
                      <div className="we-inline-row" key={linkIndex}>
                        <label><span>Type</span><select className="select" value={link.kind} onChange={(event) => { const linkedItems = [...step.linkedItems]; linkedItems[linkIndex] = { ...link, kind: event.target.value as WorkflowLink["kind"] }; updateStep(index, { linkedItems }); }}>{Object.entries(linkLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                        <label><span>Public slug</span><input className="input" placeholder="content-slug" value={link.key} onChange={(event) => { const linkedItems = [...step.linkedItems]; linkedItems[linkIndex] = { ...link, key: event.target.value }; updateStep(index, { linkedItems }); }} /></label>
                        <label><span>Display title</span><input className="input" placeholder="What people will see" value={link.titleSnapshot} onChange={(event) => { const linkedItems = [...step.linkedItems]; linkedItems[linkIndex] = { ...link, titleSnapshot: event.target.value }; updateStep(index, { linkedItems }); }} /></label>
                        <button type="button" aria-label="Remove link" onClick={() => updateStep(index, { linkedItems: step.linkedItems.filter((_, itemIndex) => itemIndex !== linkIndex) })}><Icon name="x" size={15} /></button>
                      </div>
                    ))}
                  </div>

                  <div className="we-resource-group">
                    <div className="we-resource-head"><div><Icon name="code" size={16} /><span><strong>Inline prompt text</strong><small>Prompt text written directly into this Workflow</small></span></div><button type="button" onClick={() => updateStep(index, { inlinePrompts: [...step.inlinePrompts, { id: crypto.randomUUID(), title: "", body: "" }] })}><Icon name="plus" size={14} />Add prompt text</button></div>
                    {step.inlinePrompts.length === 0 ? <p className="we-resource-empty">No inline prompt text in this step.</p> : step.inlinePrompts.map((prompt, promptIndex) => (
                      <div className="we-inline-prompt" key={prompt.id}>
                        <div className="we-inline-prompt-title"><span>Prompt text {promptIndex + 1}</span><button type="button" onClick={() => updateStep(index, { inlinePrompts: step.inlinePrompts.filter((_, itemIndex) => itemIndex !== promptIndex) })}><Icon name="trash" size={14} />Remove</button></div>
                        <label className="we-field"><span>Title</span><input className="input" placeholder="A clear label for this prompt text" value={prompt.title} onChange={(event) => { const inlinePrompts = [...step.inlinePrompts]; inlinePrompts[promptIndex] = { ...prompt, title: event.target.value }; updateStep(index, { inlinePrompts }); }} /></label>
                        <label className="we-field"><span>Prompt text</span><textarea className="textarea we-prompt-textarea" placeholder="Write the complete prompt text here…" value={prompt.body} onChange={(event) => { const inlinePrompts = [...step.inlinePrompts]; inlinePrompts[promptIndex] = { ...prompt, body: event.target.value }; updateStep(index, { inlinePrompts }); }} /></label>
                      </div>
                    ))}
                  </div>

                  <div className="we-list-fields">
                    <label className="we-field"><span>Deliverables</span><textarea className="textarea we-textarea-short" value={step.deliverables.join("\n")} onChange={(event) => updateStep(index, { deliverables: lines(event.target.value) })} placeholder={"One item per line\nFinished draft"} /><small>One item per line</small></label>
                    <label className="we-field"><span>Tips</span><textarea className="textarea we-textarea-short" value={step.tips.join("\n")} onChange={(event) => updateStep(index, { tips: lines(event.target.value) })} placeholder={"One item per line\nKeep the output specific"} /><small>One item per line</small></label>
                  </div>
                </fieldset>
              ))}
            </section>

            {state.errors?.length ? <div className="we-errors" role="alert"><strong>Check this Workflow before saving</strong><ul>{state.errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
          </div>
        </div>

        <footer className="we-mobile-save"><span>{status}</span><button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save Workflow"}</button></footer>
      </form>
    </main>
  );
}

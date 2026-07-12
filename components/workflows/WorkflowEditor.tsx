"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/data/templates";
import { createWorkflowAction, updateWorkflowAction, type WorkflowActionState } from "@/lib/userWorkflows/actions";
import type { WorkflowDocumentV1, WorkflowDraft } from "@/lib/userWorkflows/schema";

const emptyDocument = (): WorkflowDocumentV1 => ({ version: 1, prerequisites: [], steps: [] });
export type WorkflowEditorInitial = WorkflowDraft & { id: string; revision: number };

export function WorkflowEditor({ initial }: { initial?: WorkflowEditorInitial }) {
  const router = useRouter();
  const [draft, setDraft] = useState<WorkflowDraft>(initial ?? { title: "", category: CATEGORIES[0].id, blurb: "", overview: "", timeLabel: "", document: emptyDocument() });
  const [revision, setRevision] = useState(initial?.revision ?? 1);
  const [dirty, setDirty] = useState(false);
  const action = initial ? updateWorkflowAction : createWorkflowAction;
  const [state, submit, pending] = useActionState<WorkflowActionState, FormData>(action, {});
  const storageKey = `easyprompt.workflow-editor.${initial?.id ?? "new"}`;

  useEffect(() => { const raw = localStorage.getItem(storageKey); if (raw) try { setDraft(JSON.parse(raw)); } catch {} }, [storageKey]);
  useEffect(() => { if (dirty) localStorage.setItem(storageKey, JSON.stringify(draft)); }, [dirty, draft, storageKey]);
  useEffect(() => {
    if (!state.ok) return;
    localStorage.removeItem(storageKey); setDirty(false);
    if (!initial && state.id) router.replace(`/my/workflows/${state.id}/edit`);
    if (state.revision) setRevision(state.revision);
  }, [initial, router, state, storageKey]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    addEventListener("beforeunload", warn); return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  const status = useMemo(() => pending ? "Saving…" : state.conflict ? "Newer changes exist" : state.errors?.[0] ?? (state.ok ? "Saved" : dirty ? "Unsaved changes" : "Saved"), [dirty, pending, state]);
  const set = <K extends keyof WorkflowDraft>(key: K, value: WorkflowDraft[K]) => { setDraft((d) => ({ ...d, [key]: value })); setDirty(true); };
  const setDocument = (document: WorkflowDocumentV1) => set("document", document);
  const addStep = () => setDocument({ ...draft.document, steps: [...draft.document.steps, { id: crypto.randomUUID(), title: "", duration: "", explanation: "", linkedItems: [], inlinePrompts: [], deliverables: [], tips: [] }] });
  const move = (index: number, direction: -1 | 1) => { const steps = [...draft.document.steps]; const next = index + direction; if (next < 0 || next >= steps.length) return; [steps[index], steps[next]] = [steps[next], steps[index]]; setDocument({ ...draft.document, steps }); };

  return <main className="workflow-editor-page"><form action={submit} className="workflow-editor panel">
    <header><span className="wd-tag">Workflow editor</span><h1>{initial ? "Edit Workflow" : "New Workflow"}</h1><p aria-live="polite">{status}</p></header>
    <input type="hidden" name="id" value={initial?.id ?? ""}/><input type="hidden" name="revision" value={revision}/><input type="hidden" name="payload" value={JSON.stringify(draft)}/>
    <label>Title<input value={draft.title} onChange={(e)=>set("title",e.target.value)} maxLength={100}/></label>
    <label>Category<select value={draft.category} onChange={(e)=>set("category",e.target.value)}>{CATEGORIES.map((c)=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
    <label>Blurb<textarea value={draft.blurb} onChange={(e)=>set("blurb",e.target.value)} maxLength={300}/></label>
    <label>Overview<textarea value={draft.overview} onChange={(e)=>set("overview",e.target.value)} maxLength={2000}/></label>
    <label>Time label<input value={draft.timeLabel} onChange={(e)=>set("timeLabel",e.target.value)} maxLength={100}/></label>
    <label>Prerequisites<textarea value={draft.document.prerequisites.join("\n")} onChange={(e)=>setDocument({...draft.document,prerequisites:e.target.value.split("\n")})}/><small>One per line</small></label>
    <section><div className="we-section-head"><h2>Steps</h2><button type="button" className="btn btn-ghost btn-sm" onClick={addStep}>+ Add step</button></div>
      {draft.document.steps.map((step,index)=><fieldset key={step.id}><legend>Step {index+1}</legend>
        <div className="we-order"><button type="button" disabled={!index} onClick={()=>move(index,-1)} aria-label={`Move step ${index+1} up`}>↑</button><button type="button" disabled={index===draft.document.steps.length-1} onClick={()=>move(index,1)} aria-label={`Move step ${index+1} down`}>↓</button></div>
        {(["title","duration","explanation"] as const).map((key)=><label key={key}>{key[0].toUpperCase()+key.slice(1)}{key==="explanation"?<textarea value={step[key]} onChange={(e)=>{const steps=[...draft.document.steps];steps[index]={...step,[key]:e.target.value};setDocument({...draft.document,steps})}}/>:<input value={step[key]} onChange={(e)=>{const steps=[...draft.document.steps];steps[index]={...step,[key]:e.target.value};setDocument({...draft.document,steps})}}/>}</label>)}
        {(["deliverables","tips"] as const).map((key)=><label key={key}>{key[0].toUpperCase()+key.slice(1)}<textarea value={step[key].join("\n")} onChange={(e)=>{const steps=[...draft.document.steps];steps[index]={...step,[key]:e.target.value.split("\n")};setDocument({...draft.document,steps})}}/><small>One per line</small></label>)}
        <section><div className="we-section-head"><h3>Linked Templates and Prompts</h3><button type="button" onClick={()=>{const steps=[...draft.document.steps];steps[index]={...step,linkedItems:[...step.linkedItems,{kind:"catalog_template",key:"",titleSnapshot:""}]};setDocument({...draft.document,steps})}}>+ Link</button></div>{step.linkedItems.map((link,linkIndex)=><div className="we-inline-row" key={linkIndex}><select value={link.kind} onChange={(e)=>{const links=[...step.linkedItems];links[linkIndex]={...link,kind:e.target.value as typeof link.kind};const steps=[...draft.document.steps];steps[index]={...step,linkedItems:links};setDocument({...draft.document,steps})}}><option value="catalog_template">Catalog Template</option><option value="catalog_prompt">Catalog Prompt</option><option value="user_template">Community Template</option><option value="user_prompt">Community Prompt</option></select><input aria-label="Public slug or identity" placeholder="Public slug" value={link.key} onChange={(e)=>{const links=[...step.linkedItems];links[linkIndex]={...link,key:e.target.value};const steps=[...draft.document.steps];steps[index]={...step,linkedItems:links};setDocument({...draft.document,steps})}}/><input aria-label="Link title" placeholder="Display title" value={link.titleSnapshot} onChange={(e)=>{const links=[...step.linkedItems];links[linkIndex]={...link,titleSnapshot:e.target.value};const steps=[...draft.document.steps];steps[index]={...step,linkedItems:links};setDocument({...draft.document,steps})}}/><button type="button" aria-label="Remove link" onClick={()=>{const steps=[...draft.document.steps];steps[index]={...step,linkedItems:step.linkedItems.filter((_,i)=>i!==linkIndex)};setDocument({...draft.document,steps})}}>×</button></div>)}</section>
        <section><div className="we-section-head"><h3>Inline prompt text</h3><button type="button" onClick={()=>{const steps=[...draft.document.steps];steps[index]={...step,inlinePrompts:[...step.inlinePrompts,{id:crypto.randomUUID(),title:"",body:""}]};setDocument({...draft.document,steps})}}>+ Inline prompt</button></div>{step.inlinePrompts.map((prompt,promptIndex)=><div className="we-inline-prompt" key={prompt.id}><input placeholder="Inline prompt title" value={prompt.title} onChange={(e)=>{const prompts=[...step.inlinePrompts];prompts[promptIndex]={...prompt,title:e.target.value};const steps=[...draft.document.steps];steps[index]={...step,inlinePrompts:prompts};setDocument({...draft.document,steps})}}/><textarea placeholder="Prompt text" value={prompt.body} onChange={(e)=>{const prompts=[...step.inlinePrompts];prompts[promptIndex]={...prompt,body:e.target.value};const steps=[...draft.document.steps];steps[index]={...step,inlinePrompts:prompts};setDocument({...draft.document,steps})}}/><button type="button" onClick={()=>{const steps=[...draft.document.steps];steps[index]={...step,inlinePrompts:step.inlinePrompts.filter((_,i)=>i!==promptIndex)};setDocument({...draft.document,steps})}}>Remove inline prompt</button></div>)}</section>
        <button type="button" className="btn btn-ghost btn-sm" onClick={()=>{if(confirm("Remove this step?"))setDocument({...draft.document,steps:draft.document.steps.filter((_,i)=>i!==index)})}}>Remove step</button>
      </fieldset>)}
    </section>
    {state.errors?.length ? <ul className="we-errors">{state.errors.map((error)=><li key={error}>{error}</li>)}</ul>:null}
    <footer><button className="btn btn-primary" disabled={pending}>{pending?"Saving…":"Save Workflow"}</button></footer>
  </form></main>;
}

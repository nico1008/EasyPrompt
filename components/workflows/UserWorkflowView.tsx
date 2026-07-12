import Link from "next/link";
import { BookmarkButton } from "@/components/BookmarkButton";
import { Icon } from "@/components/Icon";
import { WorkflowInlinePrompt } from "@/components/WorkflowInlinePrompt";
import { WorkflowProgressProvider, WorkflowProgressSummary, WorkflowStep, WorkflowStepAction } from "./WorkflowProgress";
import type { WorkflowDocumentV1 } from "@/lib/userWorkflows/schema";

export function UserWorkflowView({ id, title, category, overview, timeLabel, document, editHref, bookmarkSlug, remixAction }:{
  id:string; title:string; category:string; overview:string; timeLabel:string; document:WorkflowDocumentV1; editHref?:string;
  bookmarkSlug?:string; remixAction?: (formData:FormData)=>void|Promise<void>;
}) {
  const stepIds=document.steps.map((step)=>step.id);
  return <WorkflowProgressProvider workflowSlug={`user:${id}`} stepIds={stepIds}><main className="workflow-detail"><div className="wd-wrap">
    <section className="wd-head"><div><span className="wd-tag">{category}</span><h1>{title}</h1><p>{overview}</p></div><aside className="wd-summary"><span><Icon name="list" size={15}/>{stepIds.length} steps</span><span><Icon name="clock" size={15}/>{timeLabel}</span><WorkflowProgressSummary/>{bookmarkSlug?<BookmarkButton target={{kind:"user_workflow",key:bookmarkSlug}}/>:null}{editHref?<Link className="btn btn-ghost btn-sm" href={editHref}>Edit</Link>:null}{remixAction?<form action={remixAction}><input type="hidden" name="slug" value={bookmarkSlug}/><button className="btn btn-ghost btn-sm">Remix and edit</button></form>:null}</aside></section>
    {document.prerequisites.length?<section className="wd-prereqs"><h2>Before you start</h2><ul>{document.prerequisites.map((item)=><li key={item}>{item}</li>)}</ul></section>:null}
    <section className="wd-steps">{document.steps.map((step,index)=><WorkflowStep key={step.id} stepId={step.id} stepNumber={index+1} duration={step.duration} title={step.title} explanation={step.explanation}>
      {step.linkedItems.length?<div className="wd-linked">{step.linkedItems.map((link)=>{const href=link.kind==="catalog_template"?`/templates/${link.key}`:link.kind==="catalog_prompt"?`/prompts/${link.key}`:link.kind==="user_template"?`/p/${link.key}`:`/prompts/${link.key}`;return <Link className="wd-linked-card" href={`${href}?workflowReturn=${encodeURIComponent(bookmarkSlug?`/w/${bookmarkSlug}`:`/my/workflows/${id}`)}&step=${step.id}`} key={`${link.kind}-${link.key}`}><span className="wd-linked-text"><span>{link.kind.includes("template")?"Template":"Prompt"}</span><strong>{link.titleSnapshot}</strong></span><Icon name="arrow-right" size={14}/></Link>})}</div>:null}
      {step.inlinePrompts.map((prompt)=><WorkflowInlinePrompt key={prompt.id} prompt={prompt}/>)}
      <div className="wd-step-lists"><div><h3>Deliverables</h3><ul>{step.deliverables.filter(Boolean).map((item)=><li key={item}>{item}</li>)}</ul></div><div><h3>Tips</h3><ul>{step.tips.filter(Boolean).map((item)=><li key={item}>{item}</li>)}</ul></div></div><WorkflowStepAction stepId={step.id} stepNumber={index+1}/>
    </WorkflowStep>)}</section>
  </div></main></WorkflowProgressProvider>;
}

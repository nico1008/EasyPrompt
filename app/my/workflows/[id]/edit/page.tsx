import { notFound } from "next/navigation";
import { WorkflowEditor } from "@/components/workflows/WorkflowEditor";
import { getUserWorkflow } from "@/lib/userWorkflows/repo";
import { readWorkflowDocument } from "@/lib/userWorkflows/schema";
export const metadata = { title: "Edit Workflow", robots: { index: false, follow: false } };
export default async function Page({params}:{params:Promise<{id:string}>}) { const {id}=await params; const row=await getUserWorkflow(id); if(!row)notFound(); return <WorkflowEditor initial={{id:row.id,revision:row.revision,title:row.title,category:row.category,blurb:row.blurb,overview:row.overview,timeLabel:row.time_label,document:readWorkflowDocument(row.document,row.document_version)}}/>; }

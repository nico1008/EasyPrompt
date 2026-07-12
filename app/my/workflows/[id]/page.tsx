import { notFound } from "next/navigation";
import { UserWorkflowView } from "@/components/workflows/UserWorkflowView";
import { getUserWorkflow } from "@/lib/userWorkflows/repo";
import { readWorkflowDocument } from "@/lib/userWorkflows/schema";
import "../../../workflows/workflows.css";
export default async function Page({params}:{params:Promise<{id:string}>}) { const {id}=await params; const row=await getUserWorkflow(id); if(!row)notFound(); return <UserWorkflowView id={row.id} title={row.title} category={row.category} overview={row.overview} timeLabel={row.time_label} document={readWorkflowDocument(row.document,row.document_version)} editHref={`/my/workflows/${id}/edit`}/>; }

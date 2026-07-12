import { notFound } from "next/navigation";
import { UserWorkflowView } from "@/components/workflows/UserWorkflowView";
import { getCommunityWorkflow } from "@/lib/userWorkflows/repo";
import { remixCommunityWorkflowAction } from "@/lib/userWorkflows/actions";
import "../../workflows/workflows.css";
export const revalidate=300;
export async function generateMetadata({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; const row=await getCommunityWorkflow(slug); return row?{title:row.title,description:row.blurb,alternates:{canonical:`/w/${slug}`}}:{title:"Workflow not found"}; }
export default async function Page({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; const row=await getCommunityWorkflow(slug); if(!row)notFound(); return <UserWorkflowView id={row.id} title={row.title} category={row.category} overview={row.overview} timeLabel={row.time_label} document={row.document} bookmarkSlug={slug} remixAction={remixCommunityWorkflowAction}/>; }

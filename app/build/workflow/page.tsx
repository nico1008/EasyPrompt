import { WorkflowEditor } from "@/components/workflows/WorkflowEditor";
import "../../workflows/workflows.css";
export const metadata = { title: "New Workflow", robots: { index: false, follow: false } };
export default function NewWorkflowPage() { return <WorkflowEditor/>; }

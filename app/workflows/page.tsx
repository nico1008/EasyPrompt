import type { Metadata } from "next";
import "@/app/templates/picker.css";
import "./workflows.css";
import { WorkflowsClient } from "./WorkflowsClient";

export const metadata: Metadata = {
  title: "Workflow library - guided AI prompt playbooks",
  description:
    "Browse guided AI prompt workflows for bigger tasks. Chain Templates, linked Prompts, and inline prompt text into practical multi-step playbooks.",
  alternates: { canonical: "/workflows" },
};

export default function WorkflowsCatalogPage() {
  return <WorkflowsClient />;
}

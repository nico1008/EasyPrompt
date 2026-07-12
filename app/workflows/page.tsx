import type { Metadata } from "next";
import "@/app/templates/picker.css";
import "./workflows.css";
import { WorkflowsClient } from "./WorkflowsClient";
import Link from "next/link";
import { listCommunityWorkflows } from "@/lib/userWorkflows/repo";
import { BookmarkButton } from "@/components/BookmarkButton";

export const metadata: Metadata = {
  title: "Workflow library - guided AI prompt playbooks",
  description:
    "Browse guided AI prompt workflows for bigger tasks. Chain Templates, linked Prompts, and inline prompt text into practical multi-step playbooks.",
  alternates: { canonical: "/workflows" },
};

export default async function WorkflowsCatalogPage() {
  const community = await listCommunityWorkflows();
  return (
    <>
      <WorkflowsClient />
      {community.length ? (
        <section className="picker-page workflows-page">
          <div className="wrap">
            <div className="page-head"><span className="lib-tag">Community</span><h2>Community Workflows</h2><p>Public playbooks created by EasyPrompt members.</p></div>
            <div className="grid">
              {community.map((workflow) => (
                <article className="workflow-tile" key={workflow.id}>
                  <div className="wt-bar"><h3 className="wt-name"><Link className="wt-namelink" href={`/w/${workflow.share_slug}`}>{workflow.title}</Link></h3><BookmarkButton compact target={{ kind: "user_workflow", key: workflow.share_slug }} /></div>
                  <div className="wt-body"><span className="wt-category">Community · {workflow.author_username ?? "Creator"}</span><p>{workflow.blurb}</p></div>
                  <div className="wt-foot"><span>{workflow.category}</span><span>{workflow.time_label}</span></div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

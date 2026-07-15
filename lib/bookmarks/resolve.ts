import "server-only";

import { categoryLabel, displayTitle, getTemplate, questionCount } from "@/data/templates";
import { getExamplePrompt } from "@/data/prompts";
import { blurbFromBody } from "@/lib/community/map";
import { getCommunityPrompt, getCommunityTemplate } from "@/lib/community/repo";
import { WORKFLOWS, workflowCategoryLabel, workflowStepCount } from "@/data/workflows";
import { getCommunityWorkflow } from "@/lib/userWorkflows/repo";
import type { BookmarkRow } from "@/lib/bookmarks/map";
import type { BookmarkTarget } from "@/lib/bookmarks/schema";

export type FavoriteItem = {
  id: string;
  objectType: "template" | "prompt" | "workflow";
  title: string;
  blurb: string;
  href: string;
  meta: string;
  target: BookmarkTarget;
  createdAt: string;
};

async function resolveFavorite(row: BookmarkRow): Promise<FavoriteItem | null> {
  if (row.target_kind === "catalog_workflow") {
    const workflow = WORKFLOWS.find((item) => item.catalogId === row.target_key);
    if (!workflow) return null;
    return { id: row.id, objectType: "workflow", title: workflow.title, blurb: workflow.blurb,
      href: `/workflows/${workflow.slug}`, meta: `${workflowCategoryLabel(workflow.category)} · ${workflowStepCount(workflow)} steps`,
      target: { kind: "catalog_workflow", key: workflow.catalogId }, createdAt: row.created_at };
  }
  if (row.target_kind === "user_workflow") {
    const workflow = await getCommunityWorkflow(row.target_key);
    if (!workflow) return null;
    return { id: row.id, objectType: "workflow", title: workflow.title, blurb: workflow.blurb,
      href: `/w/${row.target_key}`, meta: `${workflowCategoryLabel(workflow.category)} · Community Workflow`,
      target: { kind: "user_workflow", key: row.target_key }, createdAt: row.created_at };
  }
  if (row.target_kind === "catalog") {
    const template = getTemplate(row.target_key);
    if (!template) return null;
    return {
      id: row.id,
      objectType: "template",
      title: displayTitle(template),
      blurb: template.blurb,
      href: `/templates/${template.slug}`,
      meta: `${categoryLabel(template.category)} · ${questionCount(template)} questions`,
      target: { kind: "catalog", key: template.slug },
      createdAt: row.created_at,
    };
  }

  if (row.target_kind === "example_prompt") {
    const prompt = getExamplePrompt(row.target_key);
    if (!prompt) return null;
    return {
      id: row.id,
      objectType: "prompt",
      title: prompt.title,
      blurb: prompt.blurb,
      href: `/prompts/${prompt.slug}`,
      meta: `${categoryLabel(prompt.category)} · ready to use`,
      target: { kind: "example_prompt", key: prompt.slug },
      createdAt: row.created_at,
    };
  }

  if (row.target_kind === "user_template") {
    const template = await getCommunityTemplate(row.target_key);
    if (!template) return null;
    return {
      id: row.id,
      objectType: "template",
      title: template.title || "Untitled Template",
      blurb: template.blurb,
      href: `/p/${row.target_key}`,
      meta: template.author ? `Community · ${template.author.username}` : "Community Template",
      target: { kind: "user_template", key: row.target_key },
      createdAt: row.created_at,
    };
  }

  if (row.target_kind === "user_prompt") {
    const prompt = await getCommunityPrompt(row.target_key);
    if (!prompt) return null;
    return {
      id: row.id,
      objectType: "prompt",
      title: prompt.name || "Untitled Prompt",
      blurb: blurbFromBody(prompt.text),
      href: `/prompts/${row.target_key}`,
      meta: prompt.author ? `Community · ${prompt.author.username}` : "Community Prompt",
      target: { kind: "user_prompt", key: row.target_key },
      createdAt: row.created_at,
    };
  }

  return null;
}

export async function resolveFavoriteRows(rows: BookmarkRow[]): Promise<FavoriteItem[]> {
  const items = await Promise.all(rows.map(resolveFavorite));
  return items.filter((item): item is FavoriteItem => item !== null);
}

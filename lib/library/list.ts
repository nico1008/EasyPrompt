/* My Library: normalize the user's owned content (Templates + Prompts) into one
 * card model with filters. Pure (no server-only imports), so it's unit-tested and
 * usable on the server. Internal storage (notebooks / user_templates / saved_prompts)
 * is hidden behind `objectType` + `internal`; the UI never says "Built/Notebook". */

import type { IconName } from "@/components/iconNames";
import type { Database } from "@/lib/supabase/types";
import { getTemplate, displayTitle, categoryLabel } from "@/data/templates";
import { rowToNotebook } from "@/lib/notebooks/map";
import { rowToTemplate } from "@/lib/userTemplates/map";
import { rowToAnswers } from "@/lib/savedPrompts/map";
import { buildPrompt, buildPromptFromBlocks } from "@/lib/buildPrompt";

type NotebookRow = Database["public"]["Tables"]["prompt_notebooks"]["Row"];
type UserTemplateRow = Database["public"]["Tables"]["user_templates"]["Row"];
type SavedPromptRow = Database["public"]["Tables"]["saved_prompts"]["Row"];
type UserWorkflowRow = Database["public"]["Tables"]["user_workflows"]["Row"];

export type LibraryObjectType = "template" | "prompt" | "workflow";
export type LibraryInternal = "notebook" | "user_template" | "saved_prompt" | "user_workflow";
export type LibraryVisibility = "private" | "public";
export type LibraryFilter = "all" | "templates" | "prompts" | "workflows" | "favorites";

export const LIBRARY_FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "templates", label: "Templates" },
  { id: "prompts", label: "Prompts" },
  { id: "workflows", label: "Workflows" },
  { id: "favorites", label: "Favorites" },
];

export const PRIMARY_FILTERS: { id: LibraryFilter; label: string }[] = LIBRARY_FILTERS;

export function isLibraryFilter(v: string | undefined): v is LibraryFilter {
  return !!v && LIBRARY_FILTERS.some((f) => f.id === v);
}

export type LibraryItem = {
  key: string;
  objectType: LibraryObjectType;
  internal: LibraryInternal;
  id: string;
  title: string;
  icon: IconName;
  visibility: LibraryVisibility;
  shareSlug: string | null;
  meta: string;
  updatedAt: string;
  primaryHref: string;
  primaryLabel: string;
  editHref: string | null;
  /** For Prompts created from a Template: "Created from {label}" + link. */
  source: { label: string; href: string } | null;
  /** Prompt category (required before making public); null for Templates. */
  category: string | null;
  /** Short rendered snippet of the item's text; null when there's nothing to show. */
  preview: string | null;
  /** Human category label (Templates + categorized Prompts); null otherwise. */
  categoryLabel: string | null;
  /** "2 questions" / "3 blocks"; null for Prompts (size isn't meaningful). */
  sizeLabel: string | null;
  /** Formatted "last edited" date, e.g. "Jun 26, 2026". */
  updatedLabel: string;
  revision?: number;
};

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function makePreview(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.length > 240 ? `${clean.slice(0, 240).trimEnd()}...` : clean;
}

function visibilityOf(v: string | null | undefined): LibraryVisibility {
  return v === "public" || v === "published" ? "public" : "private";
}

export function buildLibrary(input: {
  notebooks: NotebookRow[];
  userTemplates: UserTemplateRow[];
  prompts: SavedPromptRow[];
  workflows?: UserWorkflowRow[];
}): LibraryItem[] {
  const items: LibraryItem[] = [];

  for (const workflow of input.workflows ?? []) {
    const document = workflow.document as { steps?: unknown[] };
    const steps = Array.isArray(document.steps) ? document.steps.length : 0;
    items.push({ key: `uw-${workflow.id}`, objectType: "workflow", internal: "user_workflow", id: workflow.id,
      title: workflow.title || "Untitled Workflow", icon: "book", visibility: visibilityOf(workflow.visibility),
      shareSlug: workflow.share_slug, meta: `${steps} ${steps === 1 ? "step" : "steps"} - ${fmtDate(workflow.updated_at)}`,
      updatedAt: workflow.updated_at, primaryHref: `/my/workflows/${workflow.id}`, primaryLabel: "Open",
      editHref: `/my/workflows/${workflow.id}/edit`, source: workflow.source_title_snapshot ? { label: workflow.source_title_snapshot,
        href: workflow.source_kind === "catalog_workflow" && workflow.source_catalog_id ? `/workflows/${workflow.source_catalog_id}` : "#" } : null,
      category: workflow.category, preview: makePreview(workflow.blurb), categoryLabel: categoryLabel(workflow.category),
      sizeLabel: `${steps} ${steps === 1 ? "step" : "steps"}`, updatedLabel: fmtDate(workflow.updated_at), revision: workflow.revision });
  }

  for (const n of input.notebooks) {
    const doc = rowToNotebook(n).doc;
    const blocks = doc.blocks.length;
    items.push({
      key: `nb-${n.id}`,
      objectType: "template",
      internal: "notebook",
      id: n.id,
      title: n.name || "Untitled template",
      icon: "code",
      visibility: visibilityOf(n.visibility),
      shareSlug: n.share_slug ?? null,
      meta: `${blocks} ${blocks === 1 ? "block" : "blocks"} - ${fmtDate(n.updated_at)}`,
      updatedAt: n.updated_at,
      primaryHref: `/my/notebooks/${n.id}`,
      primaryLabel: "Open",
      editHref: null,
      source: null,
      category: null,
      preview: makePreview(buildPromptFromBlocks(doc).text),
      categoryLabel: null,
      sizeLabel: `${blocks} ${blocks === 1 ? "block" : "blocks"}`,
      updatedLabel: fmtDate(n.updated_at),
    });
  }

  const utTitle = new Map(input.userTemplates.map((t) => [t.id, t.title]));
  const utById = new Map(input.userTemplates.map((t) => [t.id, t]));
  for (const t of input.userTemplates) {
    const fieldCount = Array.isArray(t.fields) ? (t.fields as unknown[]).length : 0;
    items.push({
      key: `ut-${t.id}`,
      objectType: "template",
      internal: "user_template",
      id: t.id,
      title: t.title,
      icon: (t.icon as IconName) ?? "star",
      visibility: visibilityOf(t.visibility),
      shareSlug: t.share_slug ?? null,
      meta: `${fieldCount} ${fieldCount === 1 ? "question" : "questions"} - ${fmtDate(t.updated_at)}`,
      updatedAt: t.updated_at,
      primaryHref: `/my/templates/${t.id}`,
      primaryLabel: "Use",
      editHref: `/my/templates/${t.id}/edit`,
      source: null,
      category: null,
      preview: makePreview(t.blurb || t.base_prompt),
      categoryLabel: t.category ? categoryLabel(t.category) : null,
      sizeLabel: `${fieldCount} ${fieldCount === 1 ? "question" : "questions"}`,
      updatedLabel: fmtDate(t.updated_at),
    });
  }

  for (const p of input.prompts) {
    let source: { label: string; href: string } | null = null;
    let previewText = p.body ?? "";
    if (p.source_kind === "catalog" && p.catalog_slug) {
      const ct = getTemplate(p.catalog_slug);
      source = { label: ct ? displayTitle(ct) : p.catalog_slug, href: `/templates/${p.catalog_slug}` };
      if (!previewText.trim() && ct) previewText = buildPrompt(ct, rowToAnswers(p, ct)).text;
    } else if (p.source_kind === "user" && p.user_template_id) {
      source = {
        label: utTitle.get(p.user_template_id) ?? "Custom template",
        href: `/my/templates/${p.user_template_id}`,
      };
      const utRow = utById.get(p.user_template_id);
      if (!previewText.trim() && utRow) {
        const tpl = rowToTemplate(utRow);
        previewText = buildPrompt(tpl, rowToAnswers(p, tpl)).text;
      }
    }
    items.push({
      key: `sp-${p.id}`,
      objectType: "prompt",
      internal: "saved_prompt",
      id: p.id,
      title: p.name || "Untitled prompt",
      icon: "letter",
      visibility: visibilityOf(p.visibility),
      shareSlug: p.share_slug ?? null,
      meta: (source ? `from ${source.label} - ` : "") + fmtDate(p.updated_at),
      updatedAt: p.updated_at,
      primaryHref: `/my/prompts/${p.id}`,
      primaryLabel: "Open",
      editHref: null,
      source,
      category: p.category ?? null,
      preview: makePreview(previewText),
      categoryLabel: p.category ? categoryLabel(p.category) : null,
      sizeLabel: null,
      updatedLabel: fmtDate(p.updated_at),
    });
  }

  items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return items;
}

/** Filter the library. `favorites` is sourced from bookmarks, handled separately. */
export function filterLibrary(items: LibraryItem[], filter: LibraryFilter): LibraryItem[] {
  switch (filter) {
    case "templates":
      return items.filter((i) => i.objectType === "template");
    case "prompts":
      return items.filter((i) => i.objectType === "prompt");
    case "workflows":
      return items.filter((i) => i.objectType === "workflow");
    case "favorites":
      return [];
    case "all":
    default:
      return items;
  }
}

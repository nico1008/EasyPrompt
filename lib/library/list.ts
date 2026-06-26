/* My Library — normalize the user's owned content (Templates + Prompts) into one
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

export type LibraryObjectType = "template" | "prompt";
export type LibraryInternal = "notebook" | "user_template" | "saved_prompt";
export type LibraryStatus = "draft" | "published" | "unlisted";
export type LibraryFilter =
  | "all"
  | "templates"
  | "prompts"
  | "drafts"
  | "published"
  | "shared"
  | "favorites";

/** Every recognized filter (kept valid so old deep links / redirects still
 *  resolve). Status — draft/published/unlisted — surfaces as a chip on each card
 *  rather than its own tab, so the visible tab bar stays at four (PRIMARY_FILTERS). */
export const LIBRARY_FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "templates", label: "Templates" },
  { id: "prompts", label: "Prompts" },
  { id: "favorites", label: "Favorites" },
  { id: "drafts", label: "Drafts" },
  { id: "published", label: "Published" },
  { id: "shared", label: "Shared" },
];

/** The four tabs shown in the My Library bar (the rest stay valid as deep links). */
export const PRIMARY_FILTERS: { id: LibraryFilter; label: string }[] = LIBRARY_FILTERS.slice(0, 4);

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
  status: LibraryStatus;
  shared: boolean;
  shareSlug: string | null;
  meta: string;
  updatedAt: string;
  primaryHref: string;
  primaryLabel: string;
  editHref: string | null;
  /** For Prompts created from a Template: "Created from {label}" + link. */
  source: { label: string; href: string } | null;
  /** Prompt category (required to publish); null for Templates. */
  category: string | null;
  /* ── Inspector view-model (additive): structured fields for the detail panel ── */
  /** Short rendered snippet of the item's text; null when there's nothing to show. */
  preview: string | null;
  /** Human category label (Templates + categorized Prompts); null otherwise. */
  categoryLabel: string | null;
  /** "2 questions" / "3 blocks"; null for Prompts (size isn't meaningful). */
  sizeLabel: string | null;
  /** Formatted "last edited" date, e.g. "Jun 26, 2026". */
  updatedLabel: string;
};

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Tidy a body into a one-glance snippet: collapse whitespace, trim to ~240 chars. */
function makePreview(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.length > 240 ? `${clean.slice(0, 240).trimEnd()}…` : clean;
}

function statusOf(v: string | null | undefined): LibraryStatus {
  return v === "published" ? "published" : v === "unlisted" ? "unlisted" : "draft";
}

export function buildLibrary(input: {
  notebooks: NotebookRow[];
  userTemplates: UserTemplateRow[];
  prompts: SavedPromptRow[];
}): LibraryItem[] {
  const items: LibraryItem[] = [];

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
      status: statusOf(n.visibility),
      shared: Boolean(n.share_slug),
      shareSlug: n.share_slug ?? null,
      meta: `${blocks} ${blocks === 1 ? "block" : "blocks"} · ${fmtDate(n.updated_at)}`,
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
      status: statusOf(t.visibility),
      shared: Boolean(t.share_slug),
      shareSlug: t.share_slug ?? null,
      meta: `${fieldCount} ${fieldCount === 1 ? "question" : "questions"} · ${fmtDate(t.updated_at)}`,
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
      status: statusOf(p.visibility),
      shared: Boolean(p.share_slug),
      shareSlug: p.share_slug ?? null,
      meta: (source ? `from ${source.label} · ` : "") + fmtDate(p.updated_at),
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

/** Filter the library. `favorites` is sourced from bookmarks, handled separately
 *  by the page, so it returns [] here. */
export function filterLibrary(items: LibraryItem[], filter: LibraryFilter): LibraryItem[] {
  switch (filter) {
    case "templates":
      return items.filter((i) => i.objectType === "template");
    case "prompts":
      return items.filter((i) => i.objectType === "prompt");
    case "drafts":
      return items.filter((i) => i.status === "draft");
    case "published":
      return items.filter((i) => i.status === "published");
    case "shared":
      return items.filter((i) => i.shared);
    case "favorites":
      return [];
    case "all":
    default:
      return items;
  }
}

import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import "@/app/prompts/prompts.css";
import { SavedPromptView } from "@/components/SavedPromptView";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSavedPrompt } from "@/lib/savedPrompts/repo";
import { getUserTemplate } from "@/lib/userTemplates/repo";
import { rowToTemplate } from "@/lib/userTemplates/map";
import { rowToAnswers } from "@/lib/savedPrompts/map";
import { buildPrompt, segmentMarkdown } from "@/lib/buildPrompt";
import { getTemplate, displayTitle } from "@/data/templates";
import type { Template } from "@/data/types";
import { savedPromptEditMode } from "@/lib/savedPrompts/presentation";
import { getCommunityTemplate } from "@/lib/community/repo";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/* Every saved Prompt opens in the canonical read view. Source and ownership only
 * determine the metadata and edit action; editing always lives under /edit. */
export default async function OpenSavedPromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/");
  const { id } = await params;
  const user = await getServerUser();
  if (!user) redirect(`/login?next=/my/prompts/${id}`);

  const saved = await getSavedPrompt(id);
  if (!saved) notFound();

  let template: Template | undefined;
  let source: { label: string; href?: string } | undefined;
  if (saved.source_kind === "catalog" && saved.catalog_slug) {
    template = getTemplate(saved.catalog_slug);
    if (template) source = { label: displayTitle(template), href: `/templates/${saved.catalog_slug}` };
  } else if (saved.source_kind === "user" && saved.user_template_id) {
    const row = await getUserTemplate(saved.user_template_id);
    if (row) {
      template = rowToTemplate(row);
      source = { label: row.title, href: `/my/templates/${row.id}` };
    }
  } else if (saved.source_surface === "community_public" && saved.source_slug_snapshot) {
    const community = await getCommunityTemplate(saved.source_slug_snapshot);
    if (community) {
      source = { label: saved.source_title_snapshot ?? community.title, href: `/p/${saved.source_slug_snapshot}` };
    }
  } else if (saved.source_surface === "owned_private" && saved.template_key?.startsWith("user:")) {
    const templateId = saved.template_key.slice(5);
    const row = await getUserTemplate(templateId);
    if (row) source = { label: saved.source_title_snapshot ?? row.title, href: `/my/templates/${row.id}` };
  }
  if (!source && saved.source_title_snapshot) {
    source = { label: saved.source_title_snapshot };
  }

  const editMode = savedPromptEditMode(saved, Boolean(template));
  if (editMode === "unavailable") notFound();

  const built = saved.body
    ? (() => {
        const text = saved.body ?? "";
        return {
          text,
          segments: segmentMarkdown(text),
          tokens: Math.max(1, Math.ceil(text.length / 4)),
          kb: (new TextEncoder().encode(text).length / 1024).toFixed(1),
        };
      })()
    : template
    ? buildPrompt(template, rowToAnswers(saved, template))
    : (() => {
        const text = saved.body ?? "";
        return {
          text,
          segments: segmentMarkdown(text),
          tokens: Math.max(1, Math.ceil(text.length / 4)),
          kb: (new TextEncoder().encode(text).length / 1024).toFixed(1),
        };
      })();

  return (
    <SavedPromptView
      name={saved.name}
      segments={built.segments}
      tokens={built.tokens}
      kb={built.kb}
      text={built.text}
      editHref={`/my/prompts/${id}/edit`}
      editLabel={editMode === "answers" ? "Edit answers" : "Edit Prompt"}
      source={source}
    />
  );
}

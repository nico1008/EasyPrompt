import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { PromptEditor } from "@/components/builder/PromptEditor";
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

export const metadata: Metadata = { robots: { index: false, follow: false } };

/* Open a saved Prompt — shows the prompt itself, not the fill-in form (the fix
 * for the old behavior). Manual prompts open the markdown editor; template-sourced
 * prompts show the generated text with Copy / Open-in and a secondary "Edit
 * answers" path back to the form at /my/prompts/[id]/edit. */
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

  // Manual / standalone Prompt → edit its markdown body in place.
  if (saved.source_kind === "manual" || (saved.body && saved.source_kind !== "catalog" && saved.source_kind !== "user")) {
    return <PromptEditor savedPromptId={saved.id} initialName={saved.name} initialBody={saved.body ?? ""} />;
  }

  // Template-sourced Prompt → resolve its Template and render the generated text.
  let template: Template | undefined;
  let source: { label: string; href: string } | undefined;
  if (saved.source_kind === "catalog" && saved.catalog_slug) {
    template = getTemplate(saved.catalog_slug);
    if (template) source = { label: displayTitle(template), href: `/templates/${saved.catalog_slug}` };
  } else if (saved.source_kind === "user" && saved.user_template_id) {
    const row = await getUserTemplate(saved.user_template_id);
    if (row) {
      template = rowToTemplate(row);
      source = { label: row.title, href: `/my/templates/${row.id}` };
    }
  }

  // Template gone but text was frozen at publish → show the frozen body.
  if (!template) {
    if (saved.body && saved.body.trim()) {
      const segments = segmentMarkdown(saved.body);
      const tokens = Math.max(1, Math.ceil(saved.body.length / 4));
      const kb = (new TextEncoder().encode(saved.body).length / 1024).toFixed(1);
      return (
        <SavedPromptView
          name={saved.name}
          segments={segments}
          tokens={tokens}
          kb={kb}
          text={saved.body}
          editHref={`/my/prompts/${id}/edit`}
        />
      );
    }
    notFound();
  }

  const answers = rowToAnswers(saved, template);
  const built = buildPrompt(template, answers);

  return (
    <SavedPromptView
      name={saved.name}
      segments={built.segments}
      tokens={built.tokens}
      kb={built.kb}
      text={built.text}
      editHref={`/my/prompts/${id}/edit`}
      source={source}
    />
  );
}

import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import "@/app/templates/[slug]/builder.css";
import { Builder } from "@/app/templates/[slug]/Builder";
import type { SaveSource } from "@/components/SavePromptButton";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSavedPrompt } from "@/lib/savedPrompts/repo";
import { getUserTemplate } from "@/lib/userTemplates/repo";
import { rowToTemplate } from "@/lib/userTemplates/map";
import { rowToAnswers } from "@/lib/savedPrompts/map";
import { getTemplate } from "@/data/templates";
import type { Template } from "@/data/types";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/* Edit a template-sourced Prompt's answers — the fill-in form. Reached from the
 * prompt view's secondary "Edit answers" action. Manual prompts have no form, so
 * they bounce back to the editor view. */
export default async function EditSavedPromptAnswersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/");
  const { id } = await params;
  const user = await getServerUser();
  if (!user) redirect(`/login?next=/my/prompts/${id}/edit`);

  const saved = await getSavedPrompt(id);
  if (!saved) notFound();

  // Manual prompts are edited in the markdown editor, not the form.
  if (saved.source_kind === "manual") redirect(`/my/prompts/${id}`);

  let template: Template | undefined;
  let source: SaveSource | undefined;
  if (saved.source_kind === "catalog" && saved.catalog_slug) {
    template = getTemplate(saved.catalog_slug);
    source = { kind: "catalog", slug: saved.catalog_slug };
  } else if (saved.source_kind === "user" && saved.user_template_id) {
    const row = await getUserTemplate(saved.user_template_id);
    if (row) {
      template = rowToTemplate(row);
      source = { kind: "user", userTemplateId: row.id };
    }
  }
  if (!template || !source) notFound();

  const initialAnswers = rowToAnswers(saved, template);

  return (
    <Builder
      template={template}
      related={[]}
      initialAnswers={initialAnswers}
      source={source}
      savedPromptId={saved.id}
      crumbs={[
        { href: "/my", label: "My Library" },
        { href: `/my/prompts/${id}`, label: saved.name },
        { label: "Edit answers" },
      ]}
      backHref={`/my/prompts/${id}`}
    />
  );
}

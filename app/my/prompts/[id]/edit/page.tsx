import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import "@/app/templates/[slug]/builder.css";
import { Builder } from "@/app/templates/[slug]/Builder";
import { PromptEditor } from "@/components/builder/PromptEditor";
import type { SaveSource } from "@/components/SavePromptButton";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSavedPrompt } from "@/lib/savedPrompts/repo";
import { getUserTemplate } from "@/lib/userTemplates/repo";
import { rowToTemplate } from "@/lib/userTemplates/map";
import { rowToAnswers } from "@/lib/savedPrompts/map";
import { getTemplate } from "@/data/templates";
import type { Template } from "@/data/types";
import { savedPromptEditMode } from "@/lib/savedPrompts/presentation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/* Explicit edit route. Template-backed Prompts edit answers; standalone Prompts
 * and frozen Prompts whose source disappeared edit their markdown body. */
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
  const editMode = savedPromptEditMode(saved, Boolean(template && source));
  if (editMode === "body") {
    return (
      <PromptEditor
        savedPromptId={saved.id}
        initialName={saved.name}
        initialBody={saved.body ?? ""}
      />
    );
  }
  if (editMode === "unavailable" || !template || !source) notFound();

  const initialAnswers = rowToAnswers(saved, template);

  return (
    <Builder
      template={template}
      related={[]}
      initialAnswers={initialAnswers}
      source={source}
      savedPromptId={saved.id}
      saveDefaultName={saved.name}
      crumbs={[
        { href: "/my", label: "My Library" },
        { href: `/my/prompts/${id}`, label: saved.name },
        { label: "Edit answers" },
      ]}
    />
  );
}

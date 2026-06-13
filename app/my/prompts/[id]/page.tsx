import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import "@/app/prompts/[slug]/builder.css";
import { Builder } from "@/app/prompts/[slug]/Builder";
import type { SaveSource } from "@/components/SavePromptButton";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSavedPrompt } from "@/lib/savedPrompts/repo";
import { getUserTemplate } from "@/lib/userTemplates/repo";
import { rowToTemplate } from "@/lib/userTemplates/map";
import { getTemplate } from "@/data/templates";
import type { Template } from "@/data/types";
import type { Answers } from "@/lib/buildPrompt";

export const metadata: Metadata = { robots: { index: false, follow: false } };

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

  const initialAnswers = (saved.answers as unknown as Answers) ?? undefined;

  return (
    <Builder
      template={template}
      related={[]}
      initialAnswers={initialAnswers}
      source={source}
      savedPromptId={saved.id}
      crumbs={[{ href: "/my", label: "My prompts" }, { label: saved.name }]}
      backHref="/my"
    />
  );
}

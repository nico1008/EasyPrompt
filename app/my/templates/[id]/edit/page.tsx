import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { TemplateEditor, type EditorInitial } from "@/components/TemplateEditor";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserTemplate } from "@/lib/userTemplates/repo";
import type { Field, Checkbox } from "@/data/types";
import "@/app/build/builder.css";
import { PromptBuilder } from "@/components/builder/PromptBuilder";
import { parseTemplateDocument } from "@/lib/templates/schema";
import { blockDocFromTemplateDocument } from "@/lib/templates/adapters";

export const metadata: Metadata = {
  title: "Edit template",
  robots: { index: false, follow: false },
};

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/");
  const { id } = await params;
  const user = await getServerUser();
  if (!user) redirect(`/login?next=/my/templates/${id}/edit`);

  const row = await getUserTemplate(id);
  if (!row) notFound();

  const document = parseTemplateDocument(row.document);
  if (document.ok) {
    return (
      <PromptBuilder
        initialDoc={blockDocFromTemplateDocument(document.value, row.title)}
        notebookId={row.id}
        initialShareSlug={row.share_slug}
        initialVisibility={row.visibility}
        initialEditVersion={row.edit_version}
        initialOutcome={row.blurb ?? ""}
        initialCategory={row.category}
        initialIcon={row.icon as import("@/components/iconNames").IconName}
      />
    );
  }

  const initial: EditorInitial = {
    id: row.id,
    title: row.title,
    category: row.category,
    icon: row.icon,
    tag: row.tag ?? "",
    blurb: row.blurb ?? "",
    intro: row.intro ?? "",
    base_prompt: row.base_prompt,
    fields: (row.fields as unknown as Field[]) ?? [],
    checkboxes: (row.checkboxes as unknown as Checkbox[]) ?? [],
  };

  return <TemplateEditor initial={initial} />;
}

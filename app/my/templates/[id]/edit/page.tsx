import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { TemplateEditor, type EditorInitial } from "@/components/TemplateEditor";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserTemplate } from "@/lib/userTemplates/repo";
import type { Field, Checkbox } from "@/data/types";

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

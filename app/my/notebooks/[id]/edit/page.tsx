import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import "../../../../build/builder.css";
import { PromptBuilder } from "@/components/builder/PromptBuilder";
import { getNotebook } from "@/lib/notebooks/repo";
import { rowToNotebook } from "@/lib/notebooks/map";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getServerUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Edit Template",
  robots: { index: false, follow: false },
};

export default async function EditBlockTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/");
  const { id } = await params;
  const user = await getServerUser();
  if (!user) redirect(`/login?next=/my/notebooks/${id}/edit`);

  const row = await getNotebook(id);
  if (!row) notFound();

  const template = rowToNotebook(row);
  return (
    <PromptBuilder
      initialDoc={template.doc}
      notebookId={template.id}
      initialShareSlug={template.shareSlug}
      initialVisibility={template.visibility}
    />
  );
}

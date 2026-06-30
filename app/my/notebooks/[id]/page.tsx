import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import "../../../build/builder.css";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getNotebook } from "@/lib/notebooks/repo";
import { rowToNotebook } from "@/lib/notebooks/map";
import { PromptBuilder } from "@/components/builder/PromptBuilder";

export const metadata: Metadata = {
  title: "Edit prompt",
  robots: { index: false, follow: false },
};

export default async function EditPromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/");
  const user = await getServerUser();
  if (!user) redirect("/login?next=/my");

  const { id } = await params;
  const row = await getNotebook(id);
  if (!row) notFound();

  const nb = rowToNotebook(row);
  return (
    <PromptBuilder
      initialDoc={nb.doc}
      notebookId={nb.id}
      initialShareSlug={nb.shareSlug}
      initialVisibility={nb.visibility}
    />
  );
}

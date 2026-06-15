import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import "../../../build/notebook.css";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getNotebook } from "@/lib/notebooks/repo";
import { rowToNotebook } from "@/lib/notebooks/map";
import { NotebookBuilder } from "@/components/notebook/NotebookBuilder";

export const metadata: Metadata = {
  title: "Edit notebook",
  robots: { index: false, follow: false },
};

export default async function EditNotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/");
  const user = await getServerUser();
  if (!user) redirect("/login?next=/my/notebooks");

  const { id } = await params;
  const row = await getNotebook(id);
  if (!row) notFound();

  const nb = rowToNotebook(row);
  return <NotebookBuilder initialDoc={nb.doc} notebookId={nb.id} />;
}

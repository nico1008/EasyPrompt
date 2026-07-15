import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import "@/app/templates/[slug]/builder.css";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getNotebook } from "@/lib/notebooks/repo";
import { rowToNotebook } from "@/lib/notebooks/map";
import { BlockTemplateRunner } from "@/components/BlockTemplateRunner";

export const metadata: Metadata = {
  title: "Template",
  robots: { index: false, follow: false },
};

export default async function OpenBlockTemplatePage({
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
  return <BlockTemplateRunner
    title={nb.name || "Untitled Template"}
    doc={nb.doc}
    fileKey={nb.id}
    breadcrumbs={[{ href: "/my", label: "My Library" }, { label: nb.name || "Untitled Template" }]}
    ownerEditHref={`/my/notebooks/${nb.id}/edit`}
  />;
}

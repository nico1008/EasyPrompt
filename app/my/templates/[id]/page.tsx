import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import "@/app/prompts/[slug]/builder.css";
import { Builder } from "@/app/prompts/[slug]/Builder";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserTemplate } from "@/lib/userTemplates/repo";
import { rowToTemplate } from "@/lib/userTemplates/map";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function RunUserTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/");
  const { id } = await params;
  const user = await getServerUser();
  if (!user) redirect(`/login?next=/my/templates/${id}`);

  const row = await getUserTemplate(id);
  if (!row) notFound();

  const template = rowToTemplate(row);
  return (
    <Builder
      template={template}
      related={[]}
      source={{ kind: "user", userTemplateId: row.id }}
      crumbs={[{ href: "/my", label: "My prompts" }, { label: template.seo_title }]}
      backHref="/my"
    />
  );
}

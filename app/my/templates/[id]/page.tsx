import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import "@/app/templates/[slug]/builder.css";
import { Builder } from "@/app/templates/[slug]/Builder";
import { FlashToast } from "@/components/FlashToast";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserTemplate } from "@/lib/userTemplates/repo";
import { rowToTemplate } from "@/lib/userTemplates/map";
import { userTemplateDefinition } from "@/lib/templates/adapters";

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
    <>
      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
      <Builder
        template={template}
        definition={userTemplateDefinition(row)}
        related={[]}
        source={{ kind: "user", userTemplateId: row.id }}
        ownerEditHref={`/my/templates/${row.id}/edit`}
        crumbs={[{ href: "/my", label: "My Library" }, { label: template.seo_title }]}
      />
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@/app/templates/[slug]/builder.css";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCommunityTemplate } from "@/lib/community/repo";
import { blurbFromBody } from "@/lib/community/map";
import { shareSlugSchema } from "@/lib/notebooks/share";
import { Builder } from "@/app/templates/[slug]/Builder";
import { CommunityBlockTemplateRunner } from "@/components/CommunityBlockTemplateRunner";

/* A community Template by share slug. Data comes from the security-definer
 * community_template(slug) RPC (exact-slug, visibility-gated, author-gated). A
 * public Template is indexable.
 * Dynamic by nature (per-slug). */
export const dynamicParams = true;
// Cacheable now that the read is cookie-free; revalidate keeps visibility fresh.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (isSupabaseConfigured() && shareSlugSchema.safeParse(slug).success) {
    const tpl = await getCommunityTemplate(slug);
    if (tpl) {
      return {
        title: `${tpl.title || "Community template"} — community template`,
        description: tpl.blurb || blurbFromBody(tpl.text, "A community Template on EasyPrompt."),
        alternates: { canonical: `/p/${slug}` },
      };
    }
  }
  return { robots: { index: false, follow: false } };
}

export default async function CommunityTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();

  const { slug } = await params;
  if (!shareSlugSchema.safeParse(slug).success) notFound();

  const tpl = await getCommunityTemplate(slug);
  if (!tpl) notFound();

  if (tpl.kind === "user_template") {
    return (
      <Builder
        template={tpl.template}
        related={[]}
        source={{ kind: "community", slug }}
        saveAsStandalone
        creator={tpl.author ? { kind: "community", author: tpl.author } : undefined}
        bookmarkTarget={{ kind: "user_template", key: slug }}
        crumbs={[{ href: "/templates", label: "Templates" }, { label: tpl.title }]}
        backHref="/templates"
      />
    );
  }

  return (
    <CommunityBlockTemplateRunner
      slug={slug}
      title={tpl.title}
      doc={tpl.doc}
      author={tpl.author}
    />
  );
}

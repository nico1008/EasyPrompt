import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "./builder.css";
import { TEMPLATES, getTemplate } from "@/data/templates";
import { Builder } from "./Builder";
import { resolveWorkflowContext } from "@/lib/workflows/context";
import { ecosystemLinksForTemplate } from "@/data/ecosystem";

/* Statically generate one page per template — the SEO growth engine. */
export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = getTemplate(slug);
  if (!t) return { title: "Prompt not found" };
  return {
    title: t.seo_title,
    description: t.seo_description,
    alternates: { canonical: `/templates/${t.slug}` },
    openGraph: {
      title: t.seo_title,
      description: t.seo_description,
      url: `/templates/${t.slug}`,
      type: "website",
    },
  };
}

export default async function BuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ workflow?: string; step?: string; workflowReturn?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const template = getTemplate(slug);
  if (!template) notFound();

  return (
    <Builder
      template={template}
      related={[]}
      ecosystemLinks={ecosystemLinksForTemplate(slug)}
      workflowContext={resolveWorkflowContext(query.workflow, query.step, query.workflowReturn)}
    />
  );
}

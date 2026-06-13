import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "./builder.css";
import {
  TEMPLATES,
  getTemplate,
  displayTitle,
  relatedTemplates,
  questionCount,
} from "@/data/templates";
import { Builder } from "./Builder";

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
    alternates: { canonical: `/prompts/${t.slug}` },
    openGraph: {
      title: t.seo_title,
      description: t.seo_description,
      url: `/prompts/${t.slug}`,
      type: "website",
    },
  };
}

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) notFound();

  const related = relatedTemplates(slug).map((r) => ({
    slug: r.slug,
    title: displayTitle(r),
    category: r.category,
    questions: questionCount(r),
  }));

  return <Builder template={template} related={related} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@/app/prompts/prompts.css";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCommunityTemplate } from "@/lib/community/repo";
import { blurbFromBody } from "@/lib/community/map";
import { shareSlugSchema } from "@/lib/notebooks/share";
import { CommunityTemplate } from "@/components/CommunityTemplate";

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
        description: blurbFromBody(tpl.text, "A community template on EasyPrompt."),
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

  return (
    <CommunityTemplate slug={slug} title={tpl.title} text={tpl.text} author={tpl.author} />
  );
}

import type { Metadata } from "next";
import { permanentRedirect, notFound } from "next/navigation";
import "@/app/templates/picker.css";
import "../prompts.css";
import { TEMPLATES } from "@/data/templates";
import { EXAMPLE_PROMPTS, getExamplePrompt } from "@/data/prompts";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCommunityPrompt } from "@/lib/community/repo";
import { blurbFromBody } from "@/lib/community/map";
import { shareSlugSchema } from "@/lib/notebooks/share";
import { PromptDetail } from "@/components/PromptDetail";
import { CommunityPrompt } from "@/components/CommunityPrompt";
import { RemixStarter } from "@/components/RemixStarter";

/* `/prompts/[slug]` resolves, in order:
 *   1. a legacy catalog slug → 308 to its new home /templates/[slug] (the path
 *      used to be the SEO'd Template detail; the static catalog is the single
 *      source of truth, so a Prompt can never claim a legacy slug);
 *   2. a curated example Prompt (static data) → the indexable detail view;
 *   3. a public user Prompt by share slug -> the community detail view.
 * Example slugs are prerendered (generateStaticParams); unknown slugs fall
 * through to the dynamic community-prompt lookup (dynamicParams). */
const LEGACY_TEMPLATE_SLUGS = new Set(TEMPLATES.map((t) => t.slug));

export const dynamicParams = true;
// Community slugs render on-demand and are now cacheable (no per-request cookies);
// revalidate so visibility changes and any transient 404 self-heal.
export const revalidate = 300;

export function generateStaticParams() {
  return EXAMPLE_PROMPTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const example = getExamplePrompt(slug);
  if (example) {
    return {
      title: `${example.title} — ready-to-use prompt`,
      description: example.blurb,
      alternates: { canonical: `/prompts/${example.slug}` },
    };
  }

  // A public community Prompt is indexable.
  if (isSupabaseConfigured() && shareSlugSchema.safeParse(slug).success) {
    const community = await getCommunityPrompt(slug);
    if (community) {
      return {
        title: `${community.name || "Community prompt"} — community prompt`,
        description: blurbFromBody(community.text, "A community prompt on EasyPrompt."),
        alternates: { canonical: `/prompts/${slug}` },
      };
    }
  }
  return { robots: { index: false, follow: false } };
}

export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (LEGACY_TEMPLATE_SLUGS.has(slug)) permanentRedirect(`/templates/${slug}`);

  const example = getExamplePrompt(slug);
  if (example) return <PromptDetail prompt={example} />;

  // Otherwise it can only be a public community Prompt by share slug.
  if (!isSupabaseConfigured()) notFound();
  if (!shareSlugSchema.safeParse(slug).success) notFound();

  const community = await getCommunityPrompt(slug);
  if (!community) notFound();

  return (
    <CommunityPrompt
      slug={slug}
      name={community.name}
      text={community.text}
      sourceSlug={community.sourceSlug}
      author={community.author}
      remixSlot={<RemixStarter slug={slug} />}
    />
  );
}

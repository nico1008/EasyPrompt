import type { Metadata } from "next";
import { permanentRedirect, notFound } from "next/navigation";
import "@/app/templates/picker.css";
import "../prompts.css";
import { TEMPLATES } from "@/data/templates";
import { EXAMPLE_PROMPTS, getExamplePrompt } from "@/data/prompts";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSharedPrompt } from "@/lib/savedPrompts/repo";
import { shareSlugSchema } from "@/lib/notebooks/share";
import { PromptDetail } from "@/components/PromptDetail";
import { SharedPrompt } from "@/components/SharedPrompt";

/* `/prompts/[slug]` resolves, in order:
 *   1. a legacy catalog slug → 308 to its new home /templates/[slug] (the path
 *      used to be the SEO'd Template detail; the static catalog is the single
 *      source of truth, so a Prompt can never claim a legacy slug);
 *   2. a curated example Prompt (static data) → the indexable detail view;
 *   3. a *published* user Prompt by share slug → the read-only shared view.
 * Example slugs are prerendered (generateStaticParams); unknown slugs fall
 * through to the dynamic shared-prompt lookup (dynamicParams). */
const LEGACY_TEMPLATE_SLUGS = new Set(TEMPLATES.map((t) => t.slug));

export const dynamicParams = true;

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
  // User-shared prompts are private links — never index them.
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

  // Otherwise it can only be a published/unlisted user Prompt by share slug.
  if (!isSupabaseConfigured()) notFound();
  if (!shareSlugSchema.safeParse(slug).success) notFound();

  const shared = await getSharedPrompt(slug);
  if (!shared) notFound();

  const text = shared.text;
  const tokens = Math.max(1, Math.ceil(text.length / 4));
  const kb = (new TextEncoder().encode(text).length / 1024).toFixed(1);

  return (
    <SharedPrompt
      name={shared.name}
      segments={[{ text, kind: "normal" as const }]}
      tokens={tokens}
      kb={kb}
      text={text}
    />
  );
}

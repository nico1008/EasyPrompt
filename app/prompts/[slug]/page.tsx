import type { Metadata } from "next";
import { permanentRedirect, notFound } from "next/navigation";
import { TEMPLATES } from "@/data/templates";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSharedPrompt } from "@/lib/savedPrompts/repo";
import { shareSlugSchema } from "@/lib/notebooks/share";
import { SharedPrompt } from "@/components/SharedPrompt";

/* `/prompts/[slug]` resolves a *published* Prompt by its slug. The path used to be
 * the SEO'd Template catalog detail, so legacy catalog slugs are reserved and
 * 308-redirected to their new home at /templates/[slug] (the static catalog is the
 * single source of truth — no next.config duplication, and a new Prompt can never
 * claim a legacy slug). */
const LEGACY_TEMPLATE_SLUGS = new Set(TEMPLATES.map((t) => t.slug));

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PublishedPromptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (LEGACY_TEMPLATE_SLUGS.has(slug)) permanentRedirect(`/templates/${slug}`);
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

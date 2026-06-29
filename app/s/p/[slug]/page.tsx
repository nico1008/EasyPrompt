import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@/app/prompts/prompts.css";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSharedPrompt } from "@/lib/savedPrompts/repo";
import { shareSlugSchema } from "@/lib/notebooks/share";
import { SharedPrompt } from "@/components/SharedPrompt";

/* Public share link for a Prompt. Read-only, no auth:
 * data comes from the security-definer shared_prompt(slug) RPC (exact-slug,
 * visibility-gated). noindex — user content shouldn't be crawled. */
export const metadata: Metadata = {
  title: "Shared prompt",
  robots: { index: false, follow: false },
};

export default async function SharedPromptLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await params;
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

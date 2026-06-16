import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "./share.css";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSharedNotebook } from "@/lib/notebooks/repo";
import { shareSlugSchema } from "@/lib/notebooks/share";
import { buildPromptFromBlocks } from "@/lib/buildPrompt";
import { SharedPrompt } from "@/components/SharedPrompt";

/* A publicly shared prompt. Read-only, no auth: the data comes from the
 * security-definer shared_notebook(slug) RPC (exact-slug only, no enumeration).
 * noindex — user content shouldn't be crawled. Dynamic by nature (per-slug). */
export const metadata: Metadata = {
  title: "Shared prompt",
  robots: { index: false, follow: false },
};

export default async function SharedPromptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();

  const { slug } = await params;
  if (!shareSlugSchema.safeParse(slug).success) notFound();

  const shared = await getSharedNotebook(slug);
  if (!shared) notFound();

  const built = buildPromptFromBlocks(shared.doc);
  return (
    <SharedPrompt
      name={shared.name}
      segments={built.segments}
      tokens={built.tokens}
      kb={built.kb}
      text={built.text}
    />
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import "@/app/templates/picker.css";
import "./prompts.css";
import { PromptsLibraryClient } from "./PromptsLibraryClient";
import { EXAMPLE_PROMPTS } from "@/data/prompts";
import { listCommunityPrompts } from "@/lib/community/repo";
import { getPublicCountsBatch } from "@/lib/metrics/repo";
import { PageLoading } from "@/components/PageLoading";

export const revalidate = 60;

/* The Prompts catalog. A "Prompt" is a finished, ready-to-paste instruction (the
 * counterpart to a reusable Template). This browses a curated set of example
 * Prompts; public discovery of community prompts is a follow-up (needs
 * a listing RPC). Mirrors the Template library so the two read as one system. */
export const metadata: Metadata = {
  title: "Prompt library — ready-to-use prompts",
  description:
    "Browse ready-to-use AI prompts for ChatGPT, Claude, and Gemini. Copy one as-is, or customize it to fit your situation.",
  alternates: { canonical: "/prompts" },
};

export default async function PromptsCatalogPage() {
  const [initialCounts, initialCommunity] = await Promise.all([
    getPublicCountsBatch(
      "example_prompt",
      EXAMPLE_PROMPTS.map((p) => p.slug)
    ),
    listCommunityPrompts(24, 0),
  ]);
  const initialCommunityUses = await getPublicCountsBatch(
    "user_prompt",
    initialCommunity.map((c) => c.slug)
  );

  return (
    <Suspense fallback={<PageLoading label="Loading Prompts" />}>
      <PromptsLibraryClient
        initialCounts={initialCounts}
        initialCommunity={initialCommunity}
        initialCommunityUses={initialCommunityUses}
      />
    </Suspense>
  );
}

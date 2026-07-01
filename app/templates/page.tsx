import { Suspense } from "react";
import type { Metadata } from "next";
import "./picker.css";
import { PromptsClient } from "./PromptsClient";
import { TEMPLATES } from "@/data/templates";
import { listCommunityTemplates } from "@/lib/community/repo";
import { getPublicCountsBatch } from "@/lib/metrics/repo";
import { getPublicAggregates } from "@/lib/ratings/repo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Template library - pick a starting point",
  description:
    "Browse free AI prompt templates by category. Filter, search, and fill any one to generate a ready prompt for ChatGPT, Claude, or Gemini.",
  alternates: { canonical: "/templates" },
};

export default async function PromptsPage() {
  const [initialCounts, initialCommunity, initialRatings] = await Promise.all([
    getPublicCountsBatch(
      "catalog",
      TEMPLATES.map((t) => t.slug)
    ),
    listCommunityTemplates(24, 0),
    getPublicAggregates(TEMPLATES.map((t) => ({ kind: "catalog" as const, key: t.slug }))),
  ]);
  const initialCommunityUses = await getPublicCountsBatch(
    "user_template",
    initialCommunity.map((c) => c.slug)
  );

  return (
    <Suspense fallback={<main className="picker-page" style={{ minHeight: "100dvh" }} />}>
      <PromptsClient
        initialCounts={initialCounts}
        initialCommunity={initialCommunity}
        initialCommunityUses={initialCommunityUses}
        initialRatings={initialRatings}
      />
    </Suspense>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import "./picker.css";
import { PromptsClient } from "./PromptsClient";

export const metadata: Metadata = {
  title: "Template library - pick a starting point",
  description:
    "Browse free AI prompt templates by category. Filter, search, and fill any one to generate a ready prompt for ChatGPT, Claude, or Gemini.",
  alternates: { canonical: "/templates" },
};

export default function PromptsPage() {
  return (
    <Suspense fallback={<main className="picker-page" style={{ minHeight: "100dvh" }} />}>
      <PromptsClient />
    </Suspense>
  );
}

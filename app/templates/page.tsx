import { Suspense } from "react";
import type { Metadata } from "next";
import "./picker.css";
import { PromptsClient } from "./PromptsClient";

export const metadata: Metadata = {
  title: "Prompt library — pick a starting point",
  description:
    "Browse free AI prompt templates by category. Filter, search, and open any one to build a perfect prompt for ChatGPT, Claude, or Gemini.",
  alternates: { canonical: "/prompts" },
};

export default function PromptsPage() {
  return (
    <Suspense fallback={<main className="picker-page" style={{ minHeight: "100dvh" }} />}>
      <PromptsClient />
    </Suspense>
  );
}

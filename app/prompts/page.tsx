import { Suspense } from "react";
import type { Metadata } from "next";
import "@/app/templates/picker.css";
import "./prompts.css";
import { PromptsLibraryClient } from "./PromptsLibraryClient";

/* The Prompts catalog. A "Prompt" is a finished, ready-to-paste instruction (the
 * counterpart to a reusable Template). This browses a curated set of example
 * Prompts; public discovery of community-published prompts is a follow-up (needs
 * a listing RPC). Mirrors the Template library so the two read as one system. */
export const metadata: Metadata = {
  title: "Prompt library — ready-to-use prompts",
  description:
    "Browse ready-to-use AI prompts for ChatGPT, Claude, and Gemini. Copy one as-is, or customize it to fit your situation.",
  alternates: { canonical: "/prompts" },
};

export default function PromptsCatalogPage() {
  return (
    <Suspense fallback={<main className="picker-page" style={{ minHeight: "100dvh" }} />}>
      <PromptsLibraryClient />
    </Suspense>
  );
}

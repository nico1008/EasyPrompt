import type { Metadata } from "next";
import { Suspense } from "react";
import { BuildClient } from "../BuildClient";
import "../builder.css";
import { PageLoading } from "@/components/PageLoading";

/* The block-based Template builder. Statically generated: it reads no per-request
   user or searchParams on the server — the client island resolves `?from=` and
   auth after mount (same pattern that keeps the catalog static). Reached from the
   /build overview's "New Template" CTA. */

export const metadata: Metadata = {
  title: "Template builder — compose a reusable template",
  description:
    "Build a reusable prompt template block by block: reorder sections, add your own inputs, and generate a ready-to-paste prompt for ChatGPT, Claude, or Gemini.",
};

export default function BuildTemplatePage() {
  return (
    <Suspense fallback={<PageLoading label="Loading Template builder" />}>
      <BuildClient />
    </Suspense>
  );
}

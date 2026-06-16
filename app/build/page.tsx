import type { Metadata } from "next";
import { Suspense } from "react";
import { BuildClient } from "./BuildClient";
import "./builder.css";

/* The block-based prompt builder. Statically generated: it reads no per-request
   user or searchParams on the server — the client island resolves `?from=` and
   auth after mount (same pattern that keeps the catalog static). */

export const metadata: Metadata = {
  title: "Prompt builder — compose a custom prompt",
  description:
    "Build a prompt block by block: reorder sections, add your own context and inputs, and copy a ready-to-paste prompt for ChatGPT, Claude, or Gemini.",
};

export default function BuildPage() {
  return (
    <Suspense fallback={null}>
      <BuildClient />
    </Suspense>
  );
}

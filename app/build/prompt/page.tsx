import type { Metadata } from "next";
import { Suspense } from "react";
import { NewPromptClient } from "./NewPromptClient";

/* New markdown Prompt editor. Statically generated and anon-safe: the client
   island resolves `?from=` and auth after mount. Save-to-library prompts sign-in;
   Copy/Open-in work logged out. Reached from the /build overview's "New Prompt"
   CTA and from a Prompt's "Customize → edit a copy" path. */

export const metadata: Metadata = {
  title: "New prompt — write and save a prompt",
  description:
    "Write a ready-to-use AI prompt in markdown, preview it live, then copy it or save it to your library.",
};

export default function NewPromptPage() {
  return (
    <Suspense fallback={null}>
      <NewPromptClient />
    </Suspense>
  );
}

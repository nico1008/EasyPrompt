"use client";

/* Seeds the markdown Prompt editor for /build/prompt. Reads `?from=<exampleSlug>`
 * to start from a curated example Prompt (the "Customize → edit a copy" path);
 * otherwise starts blank. The seed source keys the local draft so a blank prompt
 * and a "from example" prompt don't clobber each other. */

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getExamplePrompt } from "@/data/prompts";
import { PromptEditor } from "@/components/builder/PromptEditor";

export function NewPromptClient() {
  const params = useSearchParams();
  const from = params.get("from");

  const seed = useMemo(() => {
    if (from) {
      const ex = getExamplePrompt(from);
      if (ex) {
        return { draftId: `new-from-${from}`, name: `${ex.title} (my version)`, body: ex.body };
      }
    }
    return { draftId: "new", name: "", body: "" };
  }, [from]);

  return (
    <PromptEditor
      key={seed.draftId}
      draftId={seed.draftId}
      initialName={seed.name}
      initialBody={seed.body}
    />
  );
}

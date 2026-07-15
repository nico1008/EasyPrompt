"use client";

/* Seeds the markdown Prompt editor for /build/prompt. Reads `?from=<exampleSlug>`
 * to start from a curated example Prompt (the "Customize → edit a copy" path);
 * otherwise starts blank. The seed source keys the local draft so a blank prompt
 * and a "from example" prompt don't clobber each other. */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getExamplePrompt } from "@/data/prompts";
import { PromptEditor } from "@/components/builder/PromptEditor";
import { consumeEditAsPromptDraft, type EditAsPromptDraft } from "@/lib/templates/editAsPrompt";

export function NewPromptClient() {
  const params = useSearchParams();
  const from = params.get("from");
  const templateDraft = params.get("templateDraft") === "1";
  const [generated, setGenerated] = useState<EditAsPromptDraft | null>(null);

  useEffect(() => {
    if (templateDraft) setGenerated(consumeEditAsPromptDraft());
  }, [templateDraft]);

  const seed = useMemo(() => {
    if (generated) {
      return {
        draftId: `template-${generated.provenance.template_key}`,
        name: generated.name,
        body: generated.body,
        provenance: generated.provenance,
      };
    }
    if (from) {
      const ex = getExamplePrompt(from);
      if (ex) {
        return { draftId: `new-from-${from}`, name: `${ex.title} (my version)`, body: ex.body, provenance: undefined };
      }
    }
    return { draftId: "new", name: "", body: "", provenance: undefined };
  }, [from, generated]);

  return (
    <PromptEditor
      key={seed.draftId}
      draftId={seed.draftId}
      initialName={seed.name}
      initialBody={seed.body}
      initialProvenance={seed.provenance}
    />
  );
}

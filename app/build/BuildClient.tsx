"use client";

/* Client wrapper for /build. Reads `?from=<slug>` to seed a notebook from a
 * catalog template (via blockDocFromTemplate), else starts blank. The seed source
 * also keys the anonymous draft, so a blank notebook and a "customize X" notebook
 * don't clobber each other. `key` remounts the builder when the seed changes. */

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getTemplate } from "@/data/templates";
import { blockDocFromTemplate } from "@/lib/blocks/fromTemplate";
import { emptyBlockDoc } from "@/lib/blocks/defaults";
import { NotebookBuilder } from "@/components/notebook/NotebookBuilder";

export function BuildClient() {
  const params = useSearchParams();
  const from = params.get("from");

  const { doc, draftId } = useMemo(() => {
    if (from) {
      const t = getTemplate(from);
      if (t) return { doc: blockDocFromTemplate(t), draftId: `new-from-${from}` };
    }
    return { doc: emptyBlockDoc(), draftId: "new" };
  }, [from]);

  return <NotebookBuilder key={draftId} initialDoc={doc} draftId={draftId} />;
}

"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { MouseEvent } from "react";
import { Icon } from "./Icon";
import { BookmarkButton } from "./BookmarkButton";
import { UsesBadge } from "./UsesBadge";
import { copyText } from "@/lib/clipboard";
import { objectMeta } from "@/lib/library/objectMeta";
import { trackUse } from "@/lib/metrics/track";
import { useImpression } from "@/lib/metrics/useImpression";
import type { ExamplePrompt } from "@/data/prompts";

/* Prompts-library card — rendered as a dark markdown-FILE tile whose `slug.md`
   filename IS the title (the human title would just repeat it), led by the Prompt
   object glyph so a Prompt never reads like a Template. The whole tile links to the
   detail page; the Favorite toggle and one-tap Copy stop propagation so they act
   without navigating. A one-tap copy records a `use`; an impression records a
   `view`; `uses` is supplied by the grid's batch fetch. */
export function PromptCard({ p, uses }: { p: ExamplePrompt; uses?: number }) {
  const [copied, setCopied] = useState(false);
  const ref = useImpression<HTMLAnchorElement>({ kind: "example_prompt", key: p.slug });

  const copy = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (await copyText(p.body)) {
        trackUse({ kind: "example_prompt", key: p.slug }, "copy");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }
    },
    [p.body, p.slug]
  );

  return (
    <Link ref={ref} className="prompt-tile" href={`/prompts/${p.slug}`} aria-label={p.title}>
      <div className="pt-bar">
        <span className="pt-glyph" aria-hidden="true">
          <Icon name={objectMeta("prompt").icon} size={14} />
        </span>
        <h3 className="pt-file">{p.slug}.md</h3>
        <span className="pt-fav">
          <BookmarkButton compact target={{ kind: "example_prompt", key: p.slug }} />
        </span>
      </div>
      <div className="pt-body">
        <p className="pt-blurb">{p.blurb}</p>
      </div>
      <div className="pt-foot">
        <span className="pt-meta">
          <span className="pt-tag">{p.tag}</span>
          <UsesBadge target={{ kind: "example_prompt", key: p.slug }} count={uses} managed />
        </span>
        <button
          type="button"
          className={`pt-copy${copied ? " done" : ""}`}
          onClick={copy}
          aria-label={`Copy the ${p.title} prompt`}
        >
          <Icon name={copied ? "check" : "copy"} size={13} />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </Link>
  );
}

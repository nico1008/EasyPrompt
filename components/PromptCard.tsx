"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { MouseEvent } from "react";
import { Icon } from "./Icon";
import { BookmarkButton } from "./BookmarkButton";
import { copyText } from "@/lib/clipboard";
import type { ExamplePrompt } from "@/data/prompts";

/* Prompts-library grid card. Mirrors TemplateCard (same .picker-page .card
   styles) but for a ready-to-use Prompt: the whole card links to the detail
   page, while the Favorite toggle and one-tap Copy stop propagation so they act
   without navigating. */
export function PromptCard({ p }: { p: ExamplePrompt }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (await copyText(p.body)) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }
    },
    [p.body]
  );

  return (
    <Link className={`card panel${p.popular ? " popular" : ""}`} href={`/prompts/${p.slug}`}>
      <div className="top">
        <h3>{p.title}</h3>
        <span className="card-fav">
          <BookmarkButton compact target={{ kind: "example_prompt", key: p.slug }} />
        </span>
        <div className="icon">
          <Icon name={p.icon} size={18} />
        </div>
      </div>
      <p>{p.blurb}</p>
      <div className="foot">
        <span className="tag">{p.tag}</span>
        <button
          type="button"
          className={`prompt-copy${copied ? " done" : ""}`}
          onClick={copy}
          aria-label={`Copy the ${p.title} prompt`}
        >
          <Icon name={copied ? "check" : "copy"} size={13} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </Link>
  );
}

"use client";

/* Detail view for a curated example Prompt (/prompts/<slug>). Shows the prompt in
 * the shared dark code well with Copy, Open-in, Favorite, and a Customize action
 * that opens the picker modal. "Created from {Template}" links back to the source
 * Template when the example came from one. */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { BookmarkButton } from "@/components/BookmarkButton";
import { CustomizeModal } from "@/components/CustomizeModal";
import { copyText } from "@/lib/clipboard";
import { openInUrl, segmentMarkdown } from "@/lib/buildPrompt";
import { displayTitle, getTemplate } from "@/data/templates";
import type { ExamplePrompt } from "@/data/prompts";

export function PromptDetail({ prompt }: { prompt: ExamplePrompt }) {
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = prompt.body;
  const segments = useMemo(() => segmentMarkdown(text), [text]);
  const tokens = Math.max(1, Math.ceil(text.length / 4));
  const kb = (new TextEncoder().encode(text).length / 1024).toFixed(1);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const copy = useCallback(async () => {
    if (await copyText(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      flash("Prompt copied to clipboard");
    }
  }, [text, flash]);

  const source = prompt.sourceTemplateSlug ? getTemplate(prompt.sourceTemplateSlug) : undefined;
  const fileName = `${prompt.slug}.md`;

  return (
    <main className="prompt-detail">
      <Toast show={Boolean(toast)} message={toast ?? ""} />

      <div className="pd-wrap">
        <Link className="pd-back" href="/prompts">
          <Icon name="arrow-right" size={14} /> All prompts
        </Link>

        <div className="pd-head">
          <div className="pd-head-main">
            <span className="pd-tag">{prompt.tag}</span>
            <h1>{prompt.title}</h1>
            <p>{prompt.blurb}</p>
            {source && (
              <p className="pd-source">
                Created from <Link href={`/templates/${source.slug}`}>{displayTitle(source)}</Link>
              </p>
            )}
          </div>
          <BookmarkButton target={{ kind: "example_prompt", key: prompt.slug }} />
        </div>

        <CodeWell title={fileName} segments={segments} tokens={tokens} kb={kb} />

        <div className="pd-actions">
          <button className="btn btn-primary" onClick={() => void copy()}>
            <Icon name={copied ? "check" : "copy"} size={15} strokeWidth={2} />{" "}
            {copied ? "Copied!" : "Copy prompt"}
          </button>
          <button className="btn btn-ink" onClick={() => setModal(true)}>
            <Icon name="wrench" size={15} /> Customize
          </button>
          <div className="pd-openin">
            <a className="btn btn-ghost" href={openInUrl("chatgpt", text)} target="_blank" rel="noopener noreferrer">
              <span className="pd-lg gpt">G</span> ChatGPT
            </a>
            <a className="btn btn-ghost" href={openInUrl("claude", text)} target="_blank" rel="noopener noreferrer">
              <span className="pd-lg cl">C</span> Claude
            </a>
            <a className="btn btn-ghost" href={openInUrl("gemini", text)} target="_blank" rel="noopener noreferrer">
              <span className="pd-lg gem">★</span> Gemini
            </a>
          </div>
        </div>
      </div>

      <CustomizeModal
        prompt={prompt}
        open={modal}
        onClose={() => setModal(false)}
        onCopied={() => flash("Prompt copied to clipboard")}
      />
    </main>
  );
}

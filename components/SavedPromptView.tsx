"use client";

/* Read view for a saved, template-sourced Prompt (My Library → Open). Shows the
 * generated prompt itself — the fix for the old behavior that dropped the user
 * back into the fill-in form. Copy + Open-in act on the text; "Edit answers" is
 * the secondary path back to the form. Manual prompts use the PromptEditor
 * instead; this is only for prompts generated from a Template. */

import { useCallback, useState } from "react";
import Link from "next/link";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { copyText } from "@/lib/clipboard";
import { openInUrl, type Segment } from "@/lib/buildPrompt";
import "./SavedPromptView.css";

export function SavedPromptView({
  name,
  segments,
  tokens,
  kb,
  text,
  editHref,
  source,
}: {
  name: string;
  segments: Segment[];
  tokens: number;
  kb: string;
  text: string;
  editHref: string;
  source?: { label: string; href: string };
}) {
  const [toast, setToast] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (await copyText(text)) {
      setToast(true);
      setCopied(true);
      window.setTimeout(() => setToast(false), 2200);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }, [text]);

  const fileName = `${(name || "prompt").replace(/\s+/g, "-").toLowerCase()}.md`;

  return (
    <main className="saved-view">
      <Toast show={toast} message="Prompt copied to clipboard" />
      <div className="sv-wrap">
        <Link className="sv-back" href="/my">
          <Icon name="arrow-right" size={14} /> My Library
        </Link>

        <div className="sv-head">
          <h1>{name || "Untitled prompt"}</h1>
          {source && (
            <p className="sv-source">
              Created from <Link href={source.href}>{source.label}</Link>
            </p>
          )}
        </div>

        <CodeWell title={fileName} segments={segments} tokens={tokens} kb={kb} />

        <div className="sv-actions">
          <button className="btn btn-primary" onClick={() => void copy()} disabled={!text}>
            <Icon name={copied ? "check" : "copy"} size={15} strokeWidth={2} />{" "}
            {copied ? "Copied!" : "Copy prompt"}
          </button>
          <Link className="btn btn-ghost" href={editHref}>
            <Icon name="list" size={15} /> Edit answers
          </Link>
          <div className="sv-openin">
            <a className="btn btn-ghost" href={openInUrl("chatgpt", text)} target="_blank" rel="noopener noreferrer">
              <span className="sv-lg gpt">G</span> ChatGPT
            </a>
            <a className="btn btn-ghost" href={openInUrl("claude", text)} target="_blank" rel="noopener noreferrer">
              <span className="sv-lg cl">C</span> Claude
            </a>
            <a className="btn btn-ghost" href={openInUrl("gemini", text)} target="_blank" rel="noopener noreferrer">
              <span className="sv-lg gem">★</span> Gemini
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

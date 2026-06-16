"use client";

/* Read-only renderer for a publicly shared prompt (/p/<slug>). Shows the
 * assembled prompt in the shared CodeWell with copy + open-in actions and a CTA
 * back into the builder. Receives the already-built segments/text from the server
 * page (the doc itself never reaches the client). */

import { useCallback, useState } from "react";
import Link from "next/link";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { openInUrl, type Segment } from "@/lib/buildPrompt";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function SharedPrompt({
  name,
  segments,
  tokens,
  kb,
  text,
}: {
  name: string;
  segments: Segment[];
  tokens: number;
  kb: string;
  text: string;
}) {
  const [toast, setToast] = useState(false);

  const copy = useCallback(async () => {
    if (await copyText(text)) {
      setToast(true);
      window.setTimeout(() => setToast(false), 2400);
    }
  }, [text]);

  const fileName = `${(name || "prompt").replace(/\s+/g, "-").toLowerCase()}.md`;

  return (
    <main className="share-page">
      <Toast show={toast} message="Prompt copied to clipboard" />
      <div className="share-wrap">
        <div className="share-head">
          <span className="share-eyebrow">Shared prompt</span>
          <h1>{name || "Untitled prompt"}</h1>
          <p>A read-only prompt shared from EasyPrompt.</p>
        </div>

        <CodeWell title={fileName} segments={segments} tokens={tokens} kb={kb} />

        <div className="share-actions">
          <button className="btn btn-primary" onClick={() => void copy()} disabled={!text}>
            <Icon name="copy" size={15} strokeWidth={2} /> Copy prompt
          </button>
          <div className="share-openin">
            <a className="btn btn-ghost" href={openInUrl("chatgpt", text)} target="_blank" rel="noopener noreferrer">
              <span className="share-lg gpt">G</span> ChatGPT
            </a>
            <a className="btn btn-ghost" href={openInUrl("claude", text)} target="_blank" rel="noopener noreferrer">
              <span className="share-lg cl">C</span> Claude
            </a>
            <a className="btn btn-ghost" href={openInUrl("gemini", text)} target="_blank" rel="noopener noreferrer">
              <span className="share-lg gem">★</span> Gemini
            </a>
          </div>
        </div>

        <div className="share-cta panel">
          <div>
            <h2>Build your own prompt</h2>
            <p>Compose a prompt block by block — role, objective, examples — and share it like this.</p>
          </div>
          <Link className="btn btn-ink" href="/build">
            Open the builder →
          </Link>
        </div>
      </div>
    </main>
  );
}

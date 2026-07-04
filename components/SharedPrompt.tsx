"use client";

/* Read-only renderer for a publicly shared prompt (/s/p/<slug>). */

import { useCallback, useState } from "react";
import Link from "next/link";
import "./SharedPrompt.css";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { DetailActions } from "@/components/detail/DetailActions";
import { DetailShell } from "@/components/detail/DetailShell";
import {
  ProviderOpenActions,
  type ProviderOpenLinks,
} from "@/components/detail/ProviderOpenActions";
import { copyText } from "@/lib/clipboard";
import { openInUrl, type Segment } from "@/lib/buildPrompt";

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
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (await copyText(text)) {
      setToast(true);
      setCopied(true);
      window.setTimeout(() => setToast(false), 2400);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }, [text]);

  const fileName = `${(name || "prompt").replace(/\s+/g, "-").toLowerCase()}.md`;
  const providerLinks: ProviderOpenLinks = {
    chatgpt: { href: openInUrl("chatgpt", text) },
    claude: { href: openInUrl("claude", text) },
    gemini: { href: openInUrl("gemini", text) },
  };

  return (
    <>
      <Toast show={toast} message="Prompt copied to clipboard" />
      <DetailShell
        backHref="/"
        backLabel="EasyPrompt"
        badge="Shared prompt"
        title={name || "Untitled prompt"}
        description="A read-only prompt shared from EasyPrompt."
        preview={<CodeWell title={fileName} segments={segments} tokens={tokens} kb={kb} />}
        actionsPlacement="before-preview"
        actions={
          <DetailActions
            primary={
              <button className="btn btn-primary" onClick={() => void copy()} disabled={!text}>
                <Icon name={copied ? "check" : "copy"} size={15} strokeWidth={2} />{" "}
                {copied ? "Copied" : "Copy prompt"}
              </button>
            }
            providers={<ProviderOpenActions links={providerLinks} />}
          />
        }
        footer={
          <div className="share-cta panel">
            <div>
              <h2>Build your own prompt</h2>
              <p>Compose a prompt block by block and share it like this.</p>
            </div>
            <Link className="btn btn-ink" href="/build">
              Open the builder
            </Link>
          </div>
        }
      />
    </>
  );
}

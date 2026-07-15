"use client";

/* Canonical owner view for a saved Prompt (My Library → Open). Ownership only
 * adds the edit action; the reading experience matches public Prompt details. */

import { useCallback, useState } from "react";
import Link from "next/link";
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

export function SavedPromptView({
  name,
  segments,
  tokens,
  kb,
  text,
  editHref,
  editLabel,
  source,
}: {
  name: string;
  segments: Segment[];
  tokens: number;
  kb: string;
  text: string;
  editHref: string;
  editLabel: "Edit Prompt" | "Edit answers";
  source?: { label: string; href?: string };
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
  const providerLinks: ProviderOpenLinks = {
    chatgpt: { href: openInUrl("chatgpt", text) },
    claude: { href: openInUrl("claude", text) },
    gemini: { href: openInUrl("gemini", text) },
  };

  return (
    <>
      <Toast show={toast} message="Prompt copied to clipboard" />
      <DetailShell
        breadcrumbItems={[
          { href: "/my", label: "My Library" },
          { label: name || "Untitled Prompt" },
        ]}
        badge="Prompt"
        title={name || "Untitled Prompt"}
        metadata={
          source ? (
            <span className="pd-source">
              Created from {source.href ? <Link href={source.href}>{source.label}</Link> : <span>{source.label} · Source Template unavailable</span>}
            </span>
          ) : undefined
        }
        preview={<CodeWell title={fileName} segments={segments} tokens={tokens} kb={kb} />}
        actionsPlacement="before-preview"
        actions={
          <DetailActions
            primary={
              <button className="btn btn-primary" onClick={() => void copy()} disabled={!text}>
                <Icon name={copied ? "check" : "copy"} size={15} strokeWidth={2} />{" "}
                {copied ? "Copied" : "Copy Prompt"}
              </button>
            }
            secondary={
              <Link className="btn btn-ink" href={editHref}>
                <Icon name={editLabel === "Edit answers" ? "list" : "wrench"} size={15} />
                {editLabel}
              </Link>
            }
            providers={<ProviderOpenActions links={providerLinks} disabled={!text} />}
          />
        }
      />
    </>
  );
}

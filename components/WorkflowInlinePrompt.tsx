"use client";

import { useCallback, useMemo, useState } from "react";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { copyText } from "@/lib/clipboard";
import { openInUrl, segmentMarkdown } from "@/lib/buildPrompt";
import type { WorkflowInlinePrompt as WorkflowInlinePromptModel } from "@/data/workflows";
import {
  ProviderOpenActions,
  type ProviderOpenLinks,
} from "@/components/detail/ProviderOpenActions";

function textKb(text: string): string {
  const bytes =
    typeof TextEncoder !== "undefined"
      ? new TextEncoder().encode(text).length
      : unescape(encodeURIComponent(text)).length;
  return (bytes / 1024).toFixed(1);
}

export function WorkflowInlinePrompt({ prompt }: { prompt: WorkflowInlinePromptModel }) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const segments = useMemo(() => segmentMarkdown(prompt.body), [prompt.body]);
  const tokens = Math.max(1, Math.ceil(prompt.body.length / 4));
  const providerLinks: ProviderOpenLinks = {
    chatgpt: { href: openInUrl("chatgpt", prompt.body) },
    claude: { href: openInUrl("claude", prompt.body) },
    gemini: { href: openInUrl("gemini", prompt.body) },
  };

  const copy = useCallback(async () => {
    if (await copyText(prompt.body)) {
      setCopied(true);
      setToast("Inline prompt copied to clipboard");
      window.setTimeout(() => setCopied(false), 1600);
      window.setTimeout(() => setToast(null), 2200);
    }
  }, [prompt.body]);

  return (
    <article className="wd-inline-prompt">
      <Toast show={Boolean(toast)} message={toast ?? ""} />
      <div className="wd-inline-head">
        <div>
          <span>Inline prompt text</span>
          <h3>{prompt.title}</h3>
        </div>
        <div className="wd-inline-actions">
          <ProviderOpenActions links={providerLinks} compact />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copy()}>
            <Icon name={copied ? "check" : "copy"} size={14} />
            {copied ? "Copied" : "Copy inline prompt"}
          </button>
        </div>
      </div>
      <CodeWell
        title={`${prompt.id}.md`}
        segments={segments}
        tokens={tokens}
        kb={textKb(prompt.body)}
      />
    </article>
  );
}

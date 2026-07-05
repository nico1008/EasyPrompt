"use client";

import { useCallback, useMemo, useState } from "react";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { copyText } from "@/lib/clipboard";
import { segmentMarkdown } from "@/lib/buildPrompt";
import type { WorkflowInlinePrompt as WorkflowInlinePromptModel } from "@/data/workflows";

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
          <h4>{prompt.title}</h4>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copy()}>
          <Icon name={copied ? "check" : "copy"} size={14} />
          {copied ? "Copied" : "Copy inline prompt"}
        </button>
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

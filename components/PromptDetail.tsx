"use client";

/* Detail view for a curated example Prompt (/prompts/<slug>). Shows the prompt in
 * the shared dark code well with Copy, Open-in, Favorite, and Customize actions. */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { BookmarkButton } from "@/components/BookmarkButton";
import { UsesBadge } from "@/components/UsesBadge";
import { CreatorChip } from "@/components/CreatorChip";
import { CustomizeModal } from "@/components/CustomizeModal";
import { DetailActions } from "@/components/detail/DetailActions";
import { DetailShell } from "@/components/detail/DetailShell";
import {
  ProviderOpenActions,
  type ProviderOpenLinks,
} from "@/components/detail/ProviderOpenActions";
import { copyText } from "@/lib/clipboard";
import { openInUrl, segmentMarkdown } from "@/lib/buildPrompt";
import { trackUse, trackView } from "@/lib/metrics/track";
import { displayTitle, getTemplate } from "@/data/templates";
import type { ExamplePrompt } from "@/data/prompts";
import { WorkflowContextBar } from "@/components/WorkflowContextBar";
import type { WorkflowReturnContext } from "@/lib/workflows/context";
import { EcosystemLinks } from "@/components/EcosystemLinks";
import { ecosystemLinksForPrompt } from "@/data/ecosystem";

export function PromptDetail({
  prompt,
  workflowContext,
}: {
  prompt: ExamplePrompt;
  workflowContext?: WorkflowReturnContext | null;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = prompt.body;
  const segments = useMemo(() => segmentMarkdown(text), [text]);
  const tokens = Math.max(1, Math.ceil(text.length / 4));
  const kb = (new TextEncoder().encode(text).length / 1024).toFixed(1);
  const target = useMemo(
    () => ({ kind: "example_prompt" as const, key: prompt.slug }),
    [prompt.slug]
  );

  useEffect(() => {
    trackView(target);
  }, [target]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const copy = useCallback(async () => {
    if (await copyText(text)) {
      trackUse(target, "copy");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      flash("Prompt copied to clipboard");
    }
  }, [text, flash, target]);

  const source = prompt.sourceTemplateSlug ? getTemplate(prompt.sourceTemplateSlug) : undefined;
  const fileName = `${prompt.slug}.md`;
  const providerLinks: ProviderOpenLinks = {
    chatgpt: {
      href: openInUrl("chatgpt", text),
      onClick: () => trackUse(target, "open_chatgpt"),
    },
    claude: {
      href: openInUrl("claude", text),
      onClick: () => trackUse(target, "open_claude"),
    },
    gemini: {
      href: openInUrl("gemini", text),
      onClick: () => trackUse(target, "open_gemini"),
    },
  };

  return (
    <>
      <Toast show={Boolean(toast)} message={toast ?? ""} />

      <DetailShell
        backHref="/prompts"
        backLabel="All prompts"
        context={workflowContext ? <WorkflowContextBar context={workflowContext} /> : undefined}
        creator={<CreatorChip creator={{ kind: "house" }} />}
        badge={prompt.tag}
        title={prompt.title}
        description={prompt.blurb}
        metadata={
          <>
            {source && (
              <span className="pd-source">
                Created from <Link href={`/templates/${source.slug}`}>{displayTitle(source)}</Link>
              </span>
            )}
            <UsesBadge target={target} />
          </>
        }
        side={<BookmarkButton target={{ kind: "example_prompt", key: prompt.slug }} />}
        preview={<CodeWell title={fileName} segments={segments} tokens={tokens} kb={kb} />}
        actionsPlacement="before-preview"
        actions={
          <DetailActions
            primary={
              <button className="btn btn-primary" onClick={() => void copy()}>
                <Icon name={copied ? "check" : "copy"} size={15} strokeWidth={2} />{" "}
                {copied ? "Copied" : "Copy prompt"}
              </button>
            }
            secondary={
              <button className="btn btn-ink" onClick={() => setModal(true)}>
                <Icon name="wrench" size={15} /> Customize
              </button>
            }
            providers={<ProviderOpenActions links={providerLinks} />}
          />
        }
        footer={
          <EcosystemLinks
            links={ecosystemLinksForPrompt(prompt.slug)}
            currentWorkflowSlug={workflowContext?.workflowSlug}
          />
        }
      />

      <CustomizeModal
        prompt={prompt}
        open={modal}
        onClose={() => setModal(false)}
        onCopied={() => flash("Prompt copied to clipboard")}
      />
    </>
  );
}

"use client";

/* Public detail view for a community Prompt (/prompts/<share_slug>). */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { UsesBadge } from "@/components/UsesBadge";
import { CreatorChip } from "@/components/CreatorChip";
import { BookmarkButton } from "@/components/BookmarkButton";
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
import type { CommunityAuthor } from "@/lib/community/map";

export function CommunityPrompt({
  slug,
  name,
  text,
  sourceSlug,
  author,
  remixSlot,
}: {
  slug: string;
  name: string;
  text: string;
  sourceSlug: string | null;
  author: CommunityAuthor | null;
  remixSlot?: ReactNode;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const segments = useMemo(() => segmentMarkdown(text), [text]);
  const tokens = Math.max(1, Math.ceil(text.length / 4));
  const kb = (new TextEncoder().encode(text).length / 1024).toFixed(1);
  const target = useMemo(() => ({ kind: "user_prompt" as const, key: slug }), [slug]);

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
  }, [text, target, flash]);

  const source = sourceSlug ? getTemplate(sourceSlug) : undefined;
  const fileName = `${(name || "prompt").replace(/\s+/g, "-").toLowerCase()}.md`;
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
        creator={author ? <CreatorChip creator={{ kind: "community", author }} /> : null}
        badge="Community prompt"
        title={name || "Untitled prompt"}
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
        side={<BookmarkButton target={{ kind: "user_prompt", key: slug }} />}
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
            secondary={remixSlot}
            providers={<ProviderOpenActions links={providerLinks} />}
          />
        }
      />
    </>
  );
}

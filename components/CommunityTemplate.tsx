"use client";

/* Public detail view for a community Template (/p/<share_slug>). */

import { useCallback, useEffect, useMemo, useState } from "react";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { UsesBadge } from "@/components/UsesBadge";
import { CreatorChip } from "@/components/CreatorChip";
import { DetailActions } from "@/components/detail/DetailActions";
import { DetailShell } from "@/components/detail/DetailShell";
import {
  ProviderOpenActions,
  type ProviderOpenLinks,
} from "@/components/detail/ProviderOpenActions";
import { copyText } from "@/lib/clipboard";
import { openInUrl, segmentMarkdown } from "@/lib/buildPrompt";
import { trackUse, trackView } from "@/lib/metrics/track";
import type { CommunityAuthor } from "@/lib/community/map";

export function CommunityTemplate({
  slug,
  title,
  text,
  author,
}: {
  slug: string;
  title: string;
  text: string;
  author: CommunityAuthor | null;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const segments = useMemo(() => segmentMarkdown(text), [text]);
  const tokens = Math.max(1, Math.ceil(text.length / 4));
  const kb = (new TextEncoder().encode(text).length / 1024).toFixed(1);
  const target = useMemo(() => ({ kind: "user_template" as const, key: slug }), [slug]);

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

  const fileName = `${(title || "template").replace(/\s+/g, "-").toLowerCase()}.md`;
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
        backHref="/templates"
        backLabel="All templates"
        creator={author ? <CreatorChip creator={{ kind: "community", author }} /> : null}
        badge="Community template"
        title={title || "Untitled template"}
        description="A reusable template. Copy it, then fill in the bracketed parts."
        metadata={<UsesBadge target={target} />}
        preview={<CodeWell title={fileName} segments={segments} tokens={tokens} kb={kb} />}
        actions={
          <DetailActions
            primary={
              <button className="btn btn-primary" onClick={() => void copy()} disabled={!text}>
                <Icon name={copied ? "check" : "copy"} size={15} strokeWidth={2} />{" "}
                {copied ? "Copied" : "Copy template"}
              </button>
            }
            providers={<ProviderOpenActions links={providerLinks} />}
          />
        }
      />
    </>
  );
}

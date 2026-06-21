"use client";

/* Public detail view for a *published* community Prompt (/prompts/<share_slug>).
 * Unlike SharedPrompt (the minimal /s/p private-link view), this is indexable and
 * social: author chip, Uses count, source link, copy/open-in WITH usage tracking
 * (keyed user_prompt:<slug>), and a "Use as starting point" remix. Reuses the
 * curated-prompt detail styles (.prompt-detail / .pd-*) for visual parity. */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { UsesBadge } from "@/components/UsesBadge";
import { AuthorChip } from "@/components/AuthorChip";
import { copyText } from "@/lib/clipboard";
import { openInUrl, segmentMarkdown } from "@/lib/buildPrompt";
import { trackUse, trackView } from "@/lib/metrics/track";
import { remixPublishedPromptAction } from "@/lib/savedPrompts/actions";
import { displayTitle, getTemplate } from "@/data/templates";
import type { CommunityAuthor } from "@/lib/community/map";

export function CommunityPrompt({
  slug,
  name,
  text,
  sourceSlug,
  author,
}: {
  slug: string;
  name: string;
  text: string;
  sourceSlug: string | null;
  author: CommunityAuthor | null;
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

  return (
    <main className="prompt-detail">
      <Toast show={Boolean(toast)} message={toast ?? ""} />

      <div className="pd-wrap">
        <Link className="pd-back" href="/prompts">
          <Icon name="arrow-right" size={14} /> All prompts
        </Link>

        <div className="pd-head">
          <div className="pd-head-main">
            <span className="pd-tag">Community</span>
            <h1>{name || "Untitled prompt"}</h1>
            {author && (
              <p className="pd-source">
                by <AuthorChip author={author} />
              </p>
            )}
            {source && (
              <p className="pd-source">
                Created from <Link href={`/templates/${source.slug}`}>{displayTitle(source)}</Link>
              </p>
            )}
            <div className="pd-stats">
              <UsesBadge target={target} />
            </div>
          </div>
        </div>

        <CodeWell title={fileName} segments={segments} tokens={tokens} kb={kb} />

        <div className="pd-actions">
          <button className="btn btn-primary" onClick={() => void copy()}>
            <Icon name={copied ? "check" : "copy"} size={15} strokeWidth={2} />{" "}
            {copied ? "Copied!" : "Copy prompt"}
          </button>
          <form action={remixPublishedPromptAction}>
            <input type="hidden" name="share_slug" value={slug} />
            <button type="submit" className="btn btn-ink">
              <Icon name="wrench" size={15} /> Use as starting point
            </button>
          </form>
          <div className="pd-openin">
            <a
              className="btn btn-ghost"
              href={openInUrl("chatgpt", text)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackUse(target, "open_chatgpt")}
            >
              <span className="pd-lg gpt">G</span> ChatGPT
            </a>
            <a
              className="btn btn-ghost"
              href={openInUrl("claude", text)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackUse(target, "open_claude")}
            >
              <span className="pd-lg cl">C</span> Claude
            </a>
            <a
              className="btn btn-ghost"
              href={openInUrl("gemini", text)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackUse(target, "open_gemini")}
            >
              <span className="pd-lg gem">★</span> Gemini
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

/* Public detail view for a community Template (/p/<share_slug>):
 * indexable, authored, and usage-tracked (keyed user_template:<slug>). Shows the
 * template's assembled/preview prompt read-only with copy + open-in. (Full anon
 * fill-in of a community template is a follow-up.) Reuses the .prompt-detail styles. */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { UsesBadge } from "@/components/UsesBadge";
import { CreatorChip } from "@/components/CreatorChip";
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

  return (
    <main className="prompt-detail">
      <Toast show={Boolean(toast)} message={toast ?? ""} />

      <div className="pd-wrap">
        <Link className="pd-back" href="/templates">
          <Icon name="arrow-right" size={14} /> All templates
        </Link>

        <div className="pd-head">
          <div className="pd-head-main">
            <span className="pd-tag">Community template</span>
            <h1>{title || "Untitled template"}</h1>
            <p className="pd-tpl-note">
              A reusable template — copy it, then fill in the [bracketed] parts.
            </p>
            {author && (
              <div className="pd-byline">
                <CreatorChip creator={{ kind: "community", author }} />
              </div>
            )}
            <div className="pd-stats">
              <UsesBadge target={target} />
            </div>
          </div>
        </div>

        <CodeWell title={fileName} segments={segments} tokens={tokens} kb={kb} />

        <div className="pd-actions">
          <button className="btn btn-primary" onClick={() => void copy()} disabled={!text}>
            <Icon name={copied ? "check" : "copy"} size={15} strokeWidth={2} />{" "}
            {copied ? "Copied!" : "Copy template"}
          </button>
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

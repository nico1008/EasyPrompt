"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Icon } from "./Icon";
import { BookmarkButton } from "./BookmarkButton";
import { UsesBadge } from "./UsesBadge";
import { copyText } from "@/lib/clipboard";
import { objectMeta } from "@/lib/library/objectMeta";
import { trackUse } from "@/lib/metrics/track";
import { useImpression } from "@/lib/metrics/useImpression";
import { fetchCommunityPromptBody } from "@/lib/community/client";
import type { BrowsePromptItem } from "@/lib/browse/types";

/* Dark markdown-FILE tile for the Prompts grid — one shape for both house and
   community prompts (req: on-par). The filename heading is a stretched link (the
   whole tile navigates) so the Favorite, one-tap Copy, and the creator chip stay
   independently interactive without nesting anchors. House prompts copy their inline
   body instantly; community prompts lazily fetch the full body on first Copy (the
   listing ships only a preview), caching it. An impression records a `view`; `uses`
   comes from the grid's batch fetch. */
export function PromptCard({ item, uses }: { item: BrowsePromptItem; uses?: number }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<string | null>(item.body);
  const ref = useImpression<HTMLElement>({ kind: item.metricKind, key: item.slug });

  const copy = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (busy) return;
      let body = bodyRef.current;
      if (body == null) {
        setBusy(true);
        body = await fetchCommunityPromptBody(item.slug);
        bodyRef.current = body;
        setBusy(false);
      }
      if (body && (await copyText(body))) {
        trackUse({ kind: item.metricKind, key: item.slug }, "copy");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }
    },
    [busy, item.slug, item.metricKind]
  );

  return (
    <article ref={ref} className="prompt-tile">
      <div className="pt-bar">
        <span className="pt-glyph" aria-hidden="true">
          <Icon name={objectMeta("prompt").icon} size={14} />
        </span>
        <h3 className="pt-file">
          <Link className="pt-filelink" href={item.href} aria-label={item.title}>
            {item.fileName}
          </Link>
        </h3>
        {item.bookmark && (
          <span className="pt-fav">
            <BookmarkButton compact target={item.bookmark} />
          </span>
        )}
      </div>
      <div className="pt-body">
        <p className="pt-blurb">{item.blurb}</p>
      </div>
      <div className="pt-foot">
        <span className="pt-meta">
          <span className="pt-tag">{item.tag}</span>
          <UsesBadge target={{ kind: item.metricKind, key: item.slug }} count={uses} managed />
        </span>
        <button
          type="button"
          className={`pt-copy${copied ? " done" : ""}`}
          onClick={copy}
          disabled={busy}
          aria-label={`Copy the ${item.title} prompt`}
        >
          <Icon name={copied ? "check" : "copy"} size={13} />
          {copied ? "Copied" : busy ? "…" : "Copy"}
        </button>
      </div>
    </article>
  );
}

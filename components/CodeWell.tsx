"use client";

/* Shared dark code-well rendering for assembled prompts. SegmentedCode renders
 * the highlighted body (normal / muted headings / accented fill-ins) and is used
 * by both the builder payoff and the notebook preview so segment styling stays
 * identical. CodeWell wraps it with a title bar (token/kb chip) and an optional
 * footer of action buttons — used by the notebook live preview. */

import { type ReactNode } from "react";
import type { Segment } from "@/lib/buildPrompt";

export function SegmentedCode({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.kind === "normal" ? (
          <span key={i}>{s.text}</span>
        ) : (
          <span key={i} className={s.kind === "mute" ? "c-mute" : "c-acc"}>
            {s.text}
          </span>
        )
      )}
    </>
  );
}

export function CodeWell({
  title,
  segments,
  tokens,
  kb,
  footer,
  empty,
}: {
  title: string;
  segments: Segment[];
  tokens: number;
  kb: string;
  footer?: ReactNode;
  /** Shown in the body when there are no segments yet. */
  empty?: ReactNode;
}) {
  return (
    <div className="code-well dark">
      <div className="code-bar">
        <span className="pip" />
        <span>{title}</span>
        <span className="tag">
          {tokens} tokens · {kb} KB
        </span>
      </div>
      <div className="code-body">
        {segments.length ? <SegmentedCode segments={segments} /> : empty}
      </div>
      {footer && <div className="footbar">{footer}</div>}
    </div>
  );
}

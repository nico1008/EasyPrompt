"use client";

/* The dark .md-file editor surface: a transparent <textarea> stacked over a
 * syntax-highlighted <pre> mirror with identical box metrics, so markdown colors
 * live AS YOU TYPE and the caret never drifts (the highlighted-textarea technique,
 * hand-rolled, no dep). Extracted from PromptEditor so the standalone Markdown
 * editor (/build/prompt) and the template fill-in's live prompt column render the
 * exact same surface. Purely presentational: value in, onChange(value) out.
 *
 * The mirror <pre> and the <textarea> MUST keep identical layout metrics (the
 * alignment contract) — every layout-affecting property is set on BOTH via the
 * shared selector in MarkdownEditorSurface.css. */

import { useMemo, type ReactNode } from "react";
import { highlightMarkdown } from "@/lib/markdown/highlight";
import "./MarkdownEditorSurface.css";

export function MarkdownEditorSurface({
  value,
  onChange,
  fileName,
  tokens,
  kb,
  placeholder,
  ariaLabel = "Prompt body (markdown)",
  className,
  tag,
}: {
  value: string;
  onChange: (value: string) => void;
  fileName: string;
  tokens: number;
  kb: string;
  placeholder?: string;
  ariaLabel?: string;
  /** Extra class on the .md-editor root for per-page layout overrides. */
  className?: string;
  /** Optional affordance shown in the bar (e.g. an "editable" cue). */
  tag?: ReactNode;
}) {
  const segments = useMemo(() => highlightMarkdown(value), [value]);
  // Trailing-line guard: a <pre> drops the height of a final empty line, so add a
  // phantom newline to the mirror when the body is empty or ends in a newline.
  const needsGuard = value === "" || value.endsWith("\n");

  return (
    <div className={`md-editor${className ? ` ${className}` : ""}`}>
      <div className="md-bar">
        <span className="md-dot" aria-hidden="true" />
        <span className="md-file">{fileName}</span>
        {tag && <span className="md-tag">{tag}</span>}
        <span className="md-meta">
          {tokens} tokens · {kb} KB
        </span>
      </div>

      <div className="md-surface">
        <pre className="md-mirror" aria-hidden="true">
          {segments.map((s, i) => (
            <span key={i} className={`hl-${s.kind}`}>
              {s.text}
            </span>
          ))}
          {needsGuard && "\n"}
        </pre>
        <textarea
          className="md-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          spellCheck
        />
      </div>
    </div>
  );
}

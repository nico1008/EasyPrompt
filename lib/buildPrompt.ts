import type { Template } from "@/data/types";
import type { BlockDoc } from "@/lib/blocks/types";

export type Answers = {
  /** fieldId -> current string value */
  fields: Record<string, string>;
  /** checkboxId -> checked */
  checks: Record<string, boolean>;
};

export type Segment = { text: string; kind: "normal" | "mute" | "acc" };

export type BuiltPrompt = {
  /** Plain text for the clipboard / download. */
  text: string;
  /** Highlighted segments for the dark code well. */
  segments: Segment[];
  tokens: number;
  kb: string;
  answered: number;
  total: number;
  skipped: number;
};

/* Split authored text into segments, marking lines that begin with `#` as
   comment-muted (matches the .c-mute treatment in the design's code wells). */
function markAuthored(text: string): Segment[] {
  const out: Segment[] = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const isHeading = /^\s*#/.test(line);
    if (line.length) out.push({ text: line, kind: isHeading ? "mute" : "normal" });
    if (i < lines.length - 1) out.push({ text: "\n", kind: "normal" });
  });
  return out;
}

/** Split ready-to-paste markdown into highlighted segments (headings muted),
 *  for the shared dark code well. Used by the Prompts detail view and the prompt
 *  editor preview so a standalone `body` renders like every other assembled
 *  prompt. */
export function segmentMarkdown(text: string): Segment[] {
  return markAuthored(text);
}

function byteLength(s: string): number {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s).length;
  return unescape(encodeURIComponent(s)).length;
}

/** Default answers for a template — prefills selects/pills and default-on checks.
 *  Used by the catalog-integrity test and as the authored-suggestion reference;
 *  the fill-in UI seeds from `blankAnswers` so nothing is pre-selected. */
export function defaultAnswers(t: Template): Answers {
  const fields: Record<string, string> = {};
  for (const f of t.fields) {
    fields[f.id] = f.default ?? "";
  }
  const checks: Record<string, boolean> = {};
  for (const c of t.checkboxes) {
    checks[c.id] = Boolean(c.default);
  }
  return { fields, checks };
}

/** Empty answers for a template — every field blank, every checkbox off. This is
 *  the fill-in form's starting point: nothing is pre-selected, so the user chooses
 *  everything (honest "fill only what matters"). Authored `default`s are ignored
 *  here on purpose; they remain a suggestion reference via `defaultAnswers`. */
export function blankAnswers(t: Template): Answers {
  const fields: Record<string, string> = {};
  for (const f of t.fields) fields[f.id] = "";
  const checks: Record<string, boolean> = {};
  for (const c of t.checkboxes) checks[c.id] = false;
  return { fields, checks };
}

/** Number of questions answered (filled fields + checked boxes). */
export function answeredCount(t: Template, a: Answers): number {
  const filled = t.fields.filter((f) => (a.fields[f.id] ?? "").trim().length > 0).length;
  const checked = t.checkboxes.filter((c) => a.checks[c.id]).length;
  return filled + checked;
}

export function buildPrompt(t: Template, a: Answers): BuiltPrompt {
  const segments: Segment[] = [];

  // 1. Base prompt
  segments.push(...markAuthored(t.base_prompt));

  // 2. Filled fields — skip blanks (the "smart exclusion" rule)
  for (const f of t.fields) {
    const value = (a.fields[f.id] ?? "").trim();
    if (!value) continue;
    segments.push(...markAuthored(f.prefix));
    segments.push({ text: value, kind: "acc" });
  }

  // 3. Checked boxes
  for (const c of t.checkboxes) {
    if (!a.checks[c.id]) continue;
    segments.push(...markAuthored(c.injected_text));
  }

  const text = segments.map((s) => s.text).join("");
  const total = t.fields.length + t.checkboxes.length;
  const answered = answeredCount(t, a);

  return {
    text,
    segments,
    tokens: Math.max(1, Math.ceil(text.length / 4)),
    kb: (byteLength(text) / 1024).toFixed(1),
    answered,
    total,
    skipped: Math.max(0, total - answered),
  };
}

/* Assemble a notebook (BlockDoc) into the same BuiltPrompt shape as buildPrompt,
 * reusing the same primitives (markAuthored, byteLength, the ceil(len/4) token
 * estimate) so the render path — code well, token chip, copy, open-in — is
 * shared, not forked. Block order is preserved; disabled blocks, empty sections,
 * and blank variables are omitted (the smart-exclusion rule at the block level).
 * Section headings render muted (like base_prompt headings); variable fill-ins
 * render accented (like filled fields). */
export function buildPromptFromBlocks(doc: BlockDoc): BuiltPrompt {
  const segments: Segment[] = [];
  // `total` counts content blocks (sections + variables) — the ones a "X of Y
  // active" tally is about. Notes are author-only; dividers are structural; both
  // are excluded from the count.
  let total = 0;
  let answered = 0;
  let first = true;

  const separate = () => {
    if (!first) segments.push({ text: "\n\n", kind: "normal" });
    first = false;
  };

  for (const b of doc.blocks) {
    // Notes never reach the prompt; dividers emit a rule but aren't counted.
    if (b.kind === "note" || b.kind === "form_group") continue;
    if (b.kind === "divider") {
      if (!b.enabled) continue;
      separate();
      segments.push({ text: "---", kind: "normal" });
      continue;
    }

    total++;
    if (!b.enabled) continue;

    if (b.kind === "section") {
      const heading = b.heading.trim();
      const body = b.body.trim();
      if (!heading && !body) continue; // smart exclusion: empty section
      separate();
      if (heading) {
        segments.push(...markAuthored(`# ${heading}`));
        if (body) segments.push({ text: "\n", kind: "normal" });
      }
      if (body) segments.push(...markAuthored(body));
      answered++;
    } else if (b.kind === "variable") {
      const value = b.value.trim();
      if (!value) continue; // smart exclusion: blank variable
      separate();
      // Reuse the field's authored prefix (stripped of its own leading blank
      // lines — separation is handled above), exactly like buildPrompt does.
      const prefix = b.field.prefix.replace(/^\n+/, "");
      if (prefix) segments.push(...markAuthored(prefix));
      segments.push({ text: value, kind: "acc" });
      answered++;
    } else {
      if (!b.suggestedSelected || !b.injectedText.trim()) continue;
      separate();
      segments.push(...markAuthored(b.injectedText.trim()));
      answered++;
    }
  }

  const text = segments.map((s) => s.text).join("");
  return {
    text,
    segments,
    tokens: Math.max(1, Math.ceil(text.length / 4)),
    kb: (byteLength(text) / 1024).toFixed(1),
    answered,
    total,
    skipped: Math.max(0, total - answered),
  };
}

/* Deep-link a prompt into the major chat tools where the URL supports a prefill
   query. Falls back to the bare tool URL when the encoded prompt would push the
   URL past the safe cross-browser/server limit (~2000 chars) — long URLs fail
   silently on some providers. The prompt is already on the clipboard by the
   time these links render, so the bare URL is a safe landing. */
const MAX_URL_LENGTH = 1900;

export function openInUrl(tool: "chatgpt" | "claude" | "gemini", prompt: string): string {
  const q = encodeURIComponent(prompt);
  switch (tool) {
    case "chatgpt": {
      const url = `https://chatgpt.com/?q=${q}`;
      return url.length <= MAX_URL_LENGTH ? url : "https://chatgpt.com/";
    }
    case "claude": {
      const url = `https://claude.ai/new?q=${q}`;
      return url.length <= MAX_URL_LENGTH ? url : "https://claude.ai/new";
    }
    case "gemini":
      return "https://gemini.google.com/app";
  }
}

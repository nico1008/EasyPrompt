import type { Template } from "@/data/types";

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

function byteLength(s: string): number {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s).length;
  return unescape(encodeURIComponent(s)).length;
}

/** Default answers for a template — prefills selects/pills and default-on checks. */
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

/* Non-destructive markdown highlighter for the single-pane prompt editor. Splits
 * text into colored segments WITHOUT removing or adding any character, so a
 * `<pre>` mirror rendered from these segments has the exact same character
 * metrics as the `<textarea>` stacked over it (the alignment contract — caret and
 * highlight never drift). The concatenation of every segment's text equals the
 * input verbatim (asserted in tests). Pure — no DOM, no deps. */

export type HlKind = "text" | "heading" | "marker" | "quote" | "code" | "strong";
export type HlSegment = { text: string; kind: HlKind };

const HEADING = /^\s*#{1,6}\s/;
const QUOTE = /^\s*>\s?/;
const LIST = /^(\s*)([-*+] |\d+\. )(.*)$/;
const INLINE = /(`[^`]+`|\*\*[^*]+\*\*)/g;

/** Push inline spans (`code`, **bold**) for one line's text, preserving every char. */
function pushInline(out: HlSegment[], s: string): void {
  if (!s) return;
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), kind: "text" });
    const tok = m[0];
    out.push({ text: tok, kind: tok.startsWith("`") ? "code" : "strong" });
    last = m.index + tok.length;
  }
  if (last < s.length) out.push({ text: s.slice(last), kind: "text" });
}

function pushLine(out: HlSegment[], line: string): void {
  if (HEADING.test(line)) {
    out.push({ text: line, kind: "heading" });
    return;
  }
  if (QUOTE.test(line)) {
    out.push({ text: line, kind: "quote" });
    return;
  }
  const list = LIST.exec(line);
  if (list) {
    const [, indent, marker, rest] = list;
    if (indent) out.push({ text: indent, kind: "text" });
    out.push({ text: marker, kind: "marker" });
    pushInline(out, rest);
    return;
  }
  pushInline(out, line);
}

export function highlightMarkdown(text: string): HlSegment[] {
  const out: HlSegment[] = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    pushLine(out, line);
    if (i < lines.length - 1) out.push({ text: "\n", kind: "text" });
  });
  return out;
}

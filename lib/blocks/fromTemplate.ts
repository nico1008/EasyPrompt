/* Seed a BlockDoc from a catalog/user Template, so any template becomes an
 * editable starting point in the notebook builder. Pure + deterministic (stable
 * ids by index) so it's unit-testable.
 *
 * base_prompt → section blocks split on top-level `#` headings (clean, separately
 *   reorderable cells); leading text before the first heading → a markdown block.
 * fields      → variable blocks (the Field is preserved, so its authored prefix
 *   still drives assembly exactly like the classic builder).
 * checkboxes  → section blocks (heading = label, body = injected_text with its
 *   leading heading stripped to avoid a doubled heading); enabled = its default. */

import type { Template, Field } from "@/data/types";
import type { Block, BlockDoc, BlockPreset, SectionBlock, VariableBlock } from "./types";

function presetFor(heading: string): BlockPreset {
  const h = heading.toLowerCase();
  if (/role|you are|persona|system/.test(h)) return "role";
  if (/context|background/.test(h)) return "context";
  if (/task|goal|objective|instruction/.test(h)) return "task";
  if (/constraint|rule|requirement|guideline/.test(h)) return "constraints";
  if (/example/.test(h)) return "examples";
  if (/output|format|deliverable|response/.test(h)) return "output";
  return "markdown";
}

/** Split markdown into {heading, body} chunks on top-level `# ` headings.
 *  `## sub` headings stay inside the body. Pre-heading text → heading "". */
export function splitMarkdownSections(text: string): { heading: string; body: string }[] {
  const lines = text.split("\n");
  const out: { heading: string; body: string }[] = [];
  let cur: { heading: string; body: string[] } | null = null;
  const preamble: string[] = [];

  for (const line of lines) {
    const m = /^#\s+(.*)$/.exec(line);
    if (m) {
      if (cur) out.push({ heading: cur.heading, body: cur.body.join("\n").trim() });
      cur = { heading: m[1].trim(), body: [] };
    } else if (cur) {
      cur.body.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (cur) out.push({ heading: cur.heading, body: cur.body.join("\n").trim() });

  const result: { heading: string; body: string }[] = [];
  const pre = preamble.join("\n").trim();
  if (pre) result.push({ heading: "", body: pre });
  result.push(...out);
  return result;
}

/** Drop a leading `# Heading` line (and surrounding whitespace) from a chunk —
 *  injected_text usually carries its own heading we re-express as the block's. */
function stripLeadingHeading(text: string): string {
  return text.replace(/^\s+/, "").replace(/^#\s+.*(?:\n|$)/, "").trim();
}

export function blockDocFromTemplate(template: Template): BlockDoc {
  const blocks: Block[] = [];
  let n = 0;
  const id = () => `seed-${n++}`;

  for (const sec of splitMarkdownSections(template.base_prompt)) {
    if (!sec.heading && !sec.body) continue;
    const block: SectionBlock = {
      id: id(),
      kind: "section",
      preset: sec.heading ? presetFor(sec.heading) : "markdown",
      heading: sec.heading,
      body: sec.body,
      enabled: true,
      collapsed: false,
    };
    blocks.push(block);
  }

  for (const field of template.fields) {
    const block: VariableBlock = {
      id: id(),
      kind: "variable",
      field: { ...field } as Field,
      value: field.default ?? "",
      enabled: true,
      collapsed: false,
    };
    blocks.push(block);
  }

  for (const c of template.checkboxes) {
    const body = stripLeadingHeading(c.injected_text);
    if (!body && !c.label) continue;
    const block: SectionBlock = {
      id: id(),
      kind: "section",
      preset: "output",
      heading: c.label,
      body,
      enabled: Boolean(c.default),
      collapsed: false,
    };
    blocks.push(block);
  }

  return { version: 1, title: template.seo_title || template.slug, blocks };
}

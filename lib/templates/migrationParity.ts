import type { Template } from "@/data/types";
import { blankAnswers, buildPrompt, type Answers } from "@/lib/buildPrompt";
import { compileTemplate } from "./compiler";
import type { TemplateAnswers, TemplateDefinition } from "./model";

export type ParityVectorResult = {
  vector: string;
  legacy_text: string;
  canonical_text: string;
};

/** The migration contract permits only line-ending normalization and one final newline. */
export function normalizeParityText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n$/, "");
}

function vectorAnswers(template: Template): Array<{ name: string; legacy: Answers; canonical: TemplateAnswers }> {
  const vectors: Array<{ name: string; legacy: Answers; canonical: TemplateAnswers }> = [];
  const add = (name: string, legacy: Answers) => {
    const canonical: TemplateAnswers = {};
    for (const [id, value] of Object.entries(legacy.fields)) canonical[id] = value;
    for (const [id, value] of Object.entries(legacy.checks)) canonical[id] = value;
    vectors.push({ name, legacy, canonical });
  };

  add("blank", blankAnswers(template));
  for (const field of template.fields) {
    const answers = blankAnswers(template);
    answers.fields[field.id] = field.type === "select" || field.type === "pills" ? field.options[0] ?? "Example" : "Example";
    add(`field:${field.id}`, answers);
  }
  for (const checkbox of template.checkboxes) {
    const answers = blankAnswers(template);
    answers.checks[checkbox.id] = true;
    add(`toggle:${checkbox.id}`, answers);
  }
  const complete = blankAnswers(template);
  for (const field of template.fields) {
    complete.fields[field.id] = field.type === "select" || field.type === "pills" ? field.options[0] ?? "Example" : "Example";
  }
  for (const checkbox of template.checkboxes) complete.checks[checkbox.id] = true;
  add("complete", complete);
  return vectors;
}

export function compareLegacyTemplateParity(
  legacy: Template,
  canonical: TemplateDefinition
): ParityVectorResult[] {
  const failures: ParityVectorResult[] = [];
  for (const vector of vectorAnswers(legacy)) {
    const legacyText = buildPrompt(legacy, vector.legacy).text;
    const canonicalText = compileTemplate(canonical, vector.canonical).text;
    if (normalizeParityText(legacyText) !== normalizeParityText(canonicalText)) {
      failures.push({ vector: vector.name, legacy_text: legacyText, canonical_text: canonicalText });
    }
  }
  return failures;
}

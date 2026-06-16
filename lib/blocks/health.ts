/* Prompt health — a pure analysis of a BlockDoc + its built output, surfaced in
 * the builder's right inspector. Two outputs:
 *   - warnings: actionable problems ("a section is empty", "no objective")
 *   - checks  : a completeness checklist (role / objective / … ) → a 0–100 score
 * Kept pure (no React/server imports) so it's unit-tested like the assembler. */

import type { BlockDoc, BlockPreset } from "./types";
import type { BuiltPrompt } from "@/lib/buildPrompt";

export type HealthSeverity = "warn" | "info";

export type HealthWarning = {
  id: string;
  message: string;
  severity: HealthSeverity;
};

export type HealthCheck = {
  id: BlockPreset | "any";
  label: string;
  done: boolean;
};

export type PromptHealth = {
  warnings: HealthWarning[];
  checks: HealthCheck[];
  /** Completeness across the checklist, 0–100. */
  score: number;
};

/** A token count above which a prompt is flagged as "very long". */
const LONG_TOKENS = 2000;

/** True when an enabled section of `preset` has any heading or body content. */
function hasContentSection(doc: BlockDoc, preset: BlockPreset): boolean {
  return doc.blocks.some(
    (b) =>
      b.enabled &&
      b.kind === "section" &&
      b.preset === preset &&
      (b.heading.trim().length > 0 || b.body.trim().length > 0)
  );
}

export function analyzeDoc(doc: BlockDoc, built: BuiltPrompt): PromptHealth {
  const warnings: HealthWarning[] = [];

  const emptySections = doc.blocks.filter(
    (b) => b.enabled && b.kind === "section" && !b.heading.trim() && !b.body.trim()
  ).length;
  const blankVariables = doc.blocks.filter(
    (b) => b.enabled && b.kind === "variable" && !b.value.trim()
  ).length;

  // Duplicate headings among enabled, content-bearing sections.
  const headings = doc.blocks
    .filter((b): b is Extract<typeof b, { kind: "section" }> => b.kind === "section")
    .filter((b) => b.enabled && b.heading.trim().length > 0)
    .map((b) => b.heading.trim().toLowerCase());
  const hasDupHeadings = new Set(headings).size !== headings.length;

  const hasRole = hasContentSection(doc, "role") || hasContentSection(doc, "persona");
  const hasObjective = hasContentSection(doc, "task");

  if (!built.text.trim()) {
    warnings.push({
      id: "empty",
      severity: "warn",
      message: "Nothing to copy yet — add content to a block.",
    });
  }
  if (built.text.trim() && !hasObjective) {
    warnings.push({
      id: "no-objective",
      severity: "warn",
      message: "No objective — add an Objective block stating the main task.",
    });
  }
  if (built.text.trim() && !hasRole) {
    warnings.push({
      id: "no-role",
      severity: "info",
      message: "No role — a Role block helps set the model's perspective.",
    });
  }
  if (emptySections > 0) {
    warnings.push({
      id: "empty-sections",
      severity: "warn",
      message:
        emptySections === 1
          ? "1 enabled section is empty and won't appear."
          : `${emptySections} enabled sections are empty and won't appear.`,
    });
  }
  if (blankVariables > 0) {
    warnings.push({
      id: "blank-variables",
      severity: "warn",
      message:
        blankVariables === 1
          ? "1 input has no value yet."
          : `${blankVariables} inputs have no value yet.`,
    });
  }
  if (hasDupHeadings) {
    warnings.push({
      id: "dup-headings",
      severity: "info",
      message: "Two sections share a heading — consider merging or renaming.",
    });
  }
  if (built.tokens > LONG_TOKENS) {
    warnings.push({
      id: "long",
      severity: "info",
      message: `This prompt is long (~${built.tokens} tokens). Trim what the model doesn't need.`,
    });
  }

  const checks: HealthCheck[] = [
    { id: "role", label: "Role", done: hasRole },
    { id: "task", label: "Objective", done: hasObjective },
    { id: "context", label: "Context", done: hasContentSection(doc, "context") },
    { id: "output", label: "Output format", done: hasContentSection(doc, "output") },
    { id: "examples", label: "Examples", done: hasContentSection(doc, "examples") },
  ];

  const done = checks.filter((c) => c.done).length;
  const score = Math.round((done / checks.length) * 100);

  return { warnings, checks, score };
}

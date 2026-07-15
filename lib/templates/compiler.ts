import { segmentMarkdown, type Segment } from "@/lib/buildPrompt";
import type { TemplateAnswers, TemplateBlock, TemplateDefinition, TemplateDocument } from "./model";
import { parseTemplateDocument, TEMPLATE_LIMITS } from "./schema";

export type TemplateIssue = {
  code: string;
  message: string;
  source_block_id: string | null;
  field_path?: string;
};

export type CompiledDisplaySegment = Segment & {
  source_block_id: string;
  display_kind: "authored" | "answer" | "structure";
};

export type CompiledTemplateResult = {
  text: string;
  segments: CompiledDisplaySegment[];
  completion: {
    required_count: number;
    required_answered_count: number;
    missing_required_block_ids: string[];
  };
  blocking_issues: TemplateIssue[];
  warnings: TemplateIssue[];
  suggestions: TemplateIssue[];
  is_actionable: boolean;
  actions: {
    can_copy: boolean;
    can_open_provider: boolean;
    can_save_prompt: boolean;
    copy_disabled_reason?: string;
    provider_disabled_reason?: string;
    save_disabled_reason?: string;
  };
};

function issue(code: string, message: string, block?: TemplateBlock, field_path?: string): TemplateIssue {
  return { code, message, source_block_id: block?.id ?? null, field_path };
}

function structuralIssues(document: TemplateDocument): TemplateIssue[] {
  const issues: TemplateIssue[] = [];
  const ids = document.blocks.map((block) => block.id);
  const groupIds = document.form_groups.map((group) => group.id);
  if (new Set(ids).size !== ids.length) {
    issues.push(issue("duplicate_block_id", "Every block must have a unique ID."));
  }
  if (new Set(groupIds).size !== groupIds.length) {
    issues.push(issue("duplicate_group_id", "Every form section must have a unique ID."));
  }
  const knownGroups = new Set(groupIds);
  const groupPositions = new Map<string, number[]>();
  let interactive = 0;

  document.blocks.forEach((block, index) => {
    if (block.kind === "input" || block.kind === "optional_toggle") {
      if (block.enabled) interactive += 1;
      if (block.group_id && !knownGroups.has(block.group_id)) {
        issues.push(issue("broken_group_reference", "This question references a missing form section.", block, "group_id"));
      }
      if (block.group_id) {
        const positions = groupPositions.get(block.group_id) ?? [];
        positions.push(index);
        groupPositions.set(block.group_id, positions);
      }
    }
    if (block.kind === "content" && block.enabled && !block.heading?.trim() && !block.body.trim()) {
      issues.push(issue("empty_content", "Enabled Prompt content needs a heading or body.", block));
    }
    if (block.kind === "input" && block.enabled) {
      if (!block.label.trim()) issues.push(issue("empty_input_label", "User questions need a label.", block, "label"));
      if (block.input_type === "single_choice") {
        const options = (block.options ?? []).map((option) => option.trim());
        if (options.length < 2) {
          issues.push(issue("too_few_choice_options", "Single choice questions need at least two options.", block, "options"));
        }
        if (options.some((option) => !option)) {
          issues.push(issue("empty_choice_option", "Choice options cannot be empty.", block, "options"));
        }
        if (new Set(options).size !== options.length) {
          issues.push(issue("duplicate_choice_option", "Choice options must be unique.", block, "options"));
        }
      }
    }
    if (block.kind === "optional_toggle" && block.enabled) {
      if (!block.label.trim()) issues.push(issue("empty_toggle_label", "Optional choices need a label.", block, "label"));
      if (!block.injected_text.trim()) issues.push(issue("empty_toggle_injection", "Optional choices need Prompt text.", block, "injected_text"));
    }
  });

  if (interactive === 0) {
    issues.push(issue("no_interactive_blocks", "A Template needs at least one user question or optional choice."));
  }
  if (interactive > TEMPLATE_LIMITS.interactiveBlocks) {
    issues.push(issue("too_many_interactive_blocks", "Keep the Template under 20 user inputs."));
  }
  for (const positions of groupPositions.values()) {
    if (positions.length > 1 && positions.at(-1)! - positions[0] + 1 !== positions.length) {
      issues.push(issue("non_contiguous_group", "Questions in a form section must stay together."));
    }
  }
  for (const group of document.form_groups) {
    if (!groupPositions.has(group.id)) {
      issues.push(issue("empty_group", "Empty form sections must be removed before publishing."));
    }
  }
  return issues;
}

function appendMarkdown(
  segments: CompiledDisplaySegment[],
  text: string,
  source_block_id: string,
  display_kind: CompiledDisplaySegment["display_kind"]
) {
  for (const segment of segmentMarkdown(text)) {
    segments.push({ ...segment, source_block_id, display_kind });
  }
}

function buildText(document: TemplateDocument, answers: TemplateAnswers): CompiledDisplaySegment[] {
  const segments: CompiledDisplaySegment[] = [];
  for (const block of document.blocks) {
    if (!block.enabled || block.kind === "note") continue;
    const separate = () => {
      if (block.separate_from_previous && segments.length > 0) {
        segments.push({ text: "\n\n", kind: "normal", source_block_id: block.id, display_kind: "structure" });
      }
    };
    if (block.kind === "content") {
      const heading = block.heading?.trim() ? `# ${block.heading.trim()}${block.body ? "\n" : ""}` : "";
      if (!heading && !block.body) continue;
      separate();
      appendMarkdown(segments, `${heading}${block.body}`, block.id, "authored");
    } else if (block.kind === "input") {
      const rawAnswer = answers[block.id];
      const answer = typeof rawAnswer === "string" ? rawAnswer.trim() : "";
      if (!answer) continue;
      separate();
      appendMarkdown(segments, block.prompt_prefix, block.id, "authored");
      segments.push({ text: answer, kind: "acc", source_block_id: block.id, display_kind: "answer" });
      if (block.prompt_suffix) appendMarkdown(segments, block.prompt_suffix, block.id, "authored");
    } else if (block.kind === "optional_toggle") {
      if (answers[block.id] === true) {
        separate();
        appendMarkdown(segments, block.injected_text, block.id, "authored");
      }
    } else if (block.kind === "divider") {
      separate();
      appendMarkdown(segments, "---", block.id, "structure");
    }
  }
  return segments;
}

function canProduceOutput(document: TemplateDocument): boolean {
  const synthetic: TemplateAnswers = {};
  for (const block of document.blocks) {
    if (block.kind === "input") {
      synthetic[block.id] = block.input_type === "single_choice" ? block.options?.[0] ?? "Example" : "Example";
    } else if (block.kind === "optional_toggle") {
      synthetic[block.id] = true;
    }
  }
  return buildText(document, synthetic).some((segment) => segment.text.trim());
}

export function compileTemplate(
  definition: TemplateDefinition,
  answers: TemplateAnswers
): CompiledTemplateResult {
  const parsed = parseTemplateDocument(definition.document);
  if (!parsed.ok) {
    const blocking_issues = [issue("invalid_document", parsed.error)];
    return {
      text: "",
      segments: [],
      completion: { required_count: 0, required_answered_count: 0, missing_required_block_ids: [] },
      blocking_issues,
      warnings: [],
      suggestions: [],
      is_actionable: false,
      actions: {
        can_copy: false,
        can_open_provider: false,
        can_save_prompt: false,
        copy_disabled_reason: parsed.error,
        provider_disabled_reason: parsed.error,
        save_disabled_reason: parsed.error,
      },
    };
  }

  const document = parsed.value;
  const blocking_issues = structuralIssues(document);
  if (!canProduceOutput(document)) {
    blocking_issues.push(issue("no_output_path", "At least one possible user path must produce Prompt text."));
  }

  const required = document.blocks.filter(
    (block): block is Extract<TemplateBlock, { kind: "input" }> =>
      block.kind === "input" && block.enabled && block.required
  );
  const missing = required.filter((block) => {
    const value = answers[block.id];
    return typeof value !== "string" || !value.trim();
  });
  for (const block of missing) {
    blocking_issues.push(issue("missing_required_answer", "Answer this required question.", block));
  }

  const segments = buildText(document, answers);
  const text = segments.map((segment) => segment.text).join("");
  if (text.length > TEMPLATE_LIMITS.compiledPrompt) {
    blocking_issues.push(issue("compiled_prompt_too_large", "Generated Prompt exceeds 50,000 characters."));
  }
  const structurallyBlocked = blocking_issues.some((item) => item.code !== "missing_required_answer");
  const baseActionable = !structurallyBlocked && missing.length === 0 && text.trim().length > 0;
  const withinHardCap = text.length <= TEMPLATE_LIMITS.compiledPrompt;
  const canCopy = baseActionable && withinHardCap;
  const canSave = canCopy && text.length <= TEMPLATE_LIMITS.savedPrompt;
  const emptyReason = text.trim() ? undefined : "Answer a question or select an option to generate a Prompt.";
  const requiredReason = missing.length ? "Complete the required questions first." : undefined;
  const hardCapReason = withinHardCap ? undefined : "Generated Prompt exceeds 50,000 characters.";
  const blockedReason = structurallyBlocked ? "This Template has blocking validation issues." : undefined;
  const actionReason = blockedReason ?? requiredReason ?? emptyReason ?? hardCapReason;

  return {
    text,
    segments,
    completion: {
      required_count: required.length,
      required_answered_count: required.length - missing.length,
      missing_required_block_ids: missing.map((block) => block.id),
    },
    blocking_issues,
    warnings: [],
    suggestions: [],
    is_actionable: canCopy,
    actions: {
      can_copy: canCopy,
      can_open_provider: canCopy,
      can_save_prompt: canSave,
      copy_disabled_reason: canCopy ? undefined : actionReason,
      provider_disabled_reason: canCopy ? undefined : actionReason,
      save_disabled_reason: canSave
        ? undefined
        : text.length > TEMPLATE_LIMITS.savedPrompt && text.length <= TEMPLATE_LIMITS.compiledPrompt
          ? "Prompts over 20,000 characters can be copied but not saved."
          : actionReason,
    },
  };
}

export function templateReadiness(definition: TemplateDefinition): TemplateIssue[] {
  const answers: TemplateAnswers = {};
  for (const block of definition.document.blocks) {
    if (block.kind === "input") {
      answers[block.id] = block.input_type === "single_choice" ? block.options?.[0] ?? "Example" : "Example";
    } else if (block.kind === "optional_toggle") answers[block.id] = true;
  }
  return compileTemplate(definition, answers).blocking_issues.filter(
    (item) => item.code !== "missing_required_answer"
  );
}

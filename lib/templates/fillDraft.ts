import type { TemplateAnswers, TemplateDefinition, TemplateKey } from "./model";

export const FILL_DRAFT_VERSION = 1 as const;
export const FILL_DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const LOCAL_DRAFT_BUDGET_BYTES = 2 * 1024 * 1024;
const PREFIX = "easyprompt.template-fill.v1";
const EASYPROMPT_STORAGE_PREFIX = "easyprompt.";

export type FillDraft = {
  version: typeof FILL_DRAFT_VERSION;
  template_key: TemplateKey;
  revision_key: string;
  answers: TemplateAnswers;
  input_types: Record<string, "input" | "optional_toggle">;
  saved_at: string;
};

export function templateRevisionKey(definition: TemplateDefinition): string {
  return definition.revision.source_kind === "curated"
    ? `curated-${definition.revision.content_revision}`
    : `user-${definition.revision.revision_id}`;
}

export function fillSessionKey(definition: TemplateDefinition): string {
  return `${PREFIX}.session.${definition.identity.template_key}.${templateRevisionKey(definition)}`;
}

export function durableFillKey(definition: TemplateDefinition): string {
  return `${PREFIX}.durable.${definition.identity.template_key}.${templateRevisionKey(definition)}`;
}

export function durableFillPrefix(templateKey: TemplateKey): string {
  return `${PREFIX}.durable.${templateKey}.`;
}

export function makeFillDraft(definition: TemplateDefinition, answers: TemplateAnswers): FillDraft {
  const input_types: FillDraft["input_types"] = {};
  for (const block of definition.document.blocks) {
    if (block.kind === "input" || block.kind === "optional_toggle") input_types[block.id] = block.kind;
  }
  return {
    version: FILL_DRAFT_VERSION,
    template_key: definition.identity.template_key,
    revision_key: templateRevisionKey(definition),
    answers,
    input_types,
    saved_at: new Date().toISOString(),
  };
}

export function parseFillDraft(raw: string | null, now = Date.now()): FillDraft | null {
  if (!raw || raw.length > 25_000) return null;
  try {
    const value = JSON.parse(raw) as Partial<FillDraft>;
    const savedAt = Date.parse(String(value.saved_at ?? ""));
    if (
      value.version !== FILL_DRAFT_VERSION ||
      typeof value.template_key !== "string" ||
      typeof value.revision_key !== "string" ||
      !value.answers ||
      typeof value.answers !== "object" ||
      !value.input_types ||
      typeof value.input_types !== "object" ||
      !Number.isFinite(savedAt) ||
      now - savedAt > FILL_DRAFT_MAX_AGE_MS
    ) return null;
    return value as FillDraft;
  } catch {
    return null;
  }
}

export function compatibleDraftAnswers(
  draft: FillDraft,
  definition: TemplateDefinition
): { answers: TemplateAnswers; restored: number; skipped: number } {
  const answers: TemplateAnswers = {};
  let restored = 0;
  let skipped = 0;
  const current = new Map(
    definition.document.blocks.flatMap((block) =>
      block.kind === "input" || block.kind === "optional_toggle" ? [[block.id, block.kind] as const] : []
    )
  );
  for (const [id, value] of Object.entries(draft.answers)) {
    const kind = current.get(id);
    if (!kind || draft.input_types[id] !== kind) {
      skipped += 1;
      continue;
    }
    if ((kind === "input" && typeof value === "string") || (kind === "optional_toggle" && typeof value === "boolean")) {
      answers[id] = value;
      restored += 1;
    } else skipped += 1;
  }
  return { answers, restored, skipped };
}

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

/** Remove expired fill drafts before enforcing the shared EasyPrompt local budget. */
export function pruneExpiredFillDrafts(storage: DraftStorage, now = Date.now()): void {
  const remove: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(`${PREFIX}.durable.`)) continue;
    if (!parseFillDraft(storage.getItem(key), now)) remove.push(key);
  }
  remove.forEach((key) => storage.removeItem(key));
}

export function writeDurableFillDraft(
  storage: DraftStorage,
  definition: TemplateDefinition,
  answers: TemplateAnswers
): "saved" | "too_large" | "storage_failed" {
  try {
    pruneExpiredFillDrafts(storage);
    const key = durableFillKey(definition);
    const value = JSON.stringify(makeFillDraft(definition, answers));
    let bytes = key.length * 2 + value.length * 2;
    for (let index = 0; index < storage.length; index += 1) {
      const existingKey = storage.key(index);
      if (!existingKey?.startsWith(EASYPROMPT_STORAGE_PREFIX) || existingKey === key) continue;
      bytes += existingKey.length * 2 + (storage.getItem(existingKey)?.length ?? 0) * 2;
    }
    if (bytes > LOCAL_DRAFT_BUDGET_BYTES) return "too_large";
    storage.setItem(key, value);
    return "saved";
  } catch {
    return "storage_failed";
  }
}

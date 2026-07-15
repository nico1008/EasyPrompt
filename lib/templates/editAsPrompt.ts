import { promptProvenanceSchema, type PromptTemplateProvenance } from "./provenance";

const KEY = "easyprompt.edit-as-prompt.v1";
const MAX_AGE_MS = 30 * 60 * 1000;

export type EditAsPromptDraft = {
  name: string;
  body: string;
  provenance: PromptTemplateProvenance;
  created_at: string;
};

export function storeEditAsPromptDraft(draft: EditAsPromptDraft): boolean {
  if (typeof window === "undefined" || !draft.body.trim() || draft.body.length > 20_000) return false;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}
export function consumeEditAsPromptDraft(): EditAsPromptDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY);
  window.sessionStorage.removeItem(KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<EditAsPromptDraft>;
    const provenance = promptProvenanceSchema.safeParse(value.provenance);
    const created = Date.parse(String(value.created_at ?? ""));
    if (
      typeof value.name !== "string" ||
      typeof value.body !== "string" ||
      !value.body.trim() ||
      value.body.length > 20_000 ||
      !provenance.success ||
      !Number.isFinite(created) ||
      Date.now() - created > MAX_AGE_MS
    ) return null;
    return { name: value.name, body: value.body, provenance: provenance.data, created_at: new Date(created).toISOString() };
  } catch {
    return null;
  }
}

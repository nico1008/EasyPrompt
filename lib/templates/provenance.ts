import { z } from "zod";
import type { TemplateDefinition } from "./model";

export const promptProvenanceSchema = z.object({
  template_key: z.string().max(160),
  source_kind: z.enum(["curated", "user"]),
  source_surface: z.enum(["curated_catalog", "community_public", "owned_private"]),
  revision_id: z.string().max(160).optional(),
  content_revision: z.number().int().positive().optional(),
  source_title_snapshot: z.string().max(120),
  source_author_snapshot: z.string().max(80).optional(),
  source_slug_snapshot: z.string().max(160).optional(),
  source_created_at: z.string().datetime(),
});

export type PromptTemplateProvenance = z.infer<typeof promptProvenanceSchema>;

export function provenanceFromTemplate(definition: TemplateDefinition): PromptTemplateProvenance {
  return {
    template_key: definition.identity.template_key,
    source_kind: definition.identity.source_kind,
    source_surface: definition.provenance.source_surface,
    revision_id: definition.revision.source_kind === "user" ? definition.revision.revision_id : undefined,
    content_revision:
      definition.revision.source_kind === "curated" ? definition.revision.content_revision : undefined,
    source_title_snapshot: definition.metadata.title,
    source_author_snapshot: definition.metadata.creator_nickname,
    source_slug_snapshot: definition.metadata.slug ?? undefined,
    source_created_at: new Date().toISOString(),
  };
}
export function parsePromptProvenance(raw: FormDataEntryValue | null): PromptTemplateProvenance | null {
  if (typeof raw !== "string" || raw.length > 4_000) return null;
  try {
    const parsed = promptProvenanceSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

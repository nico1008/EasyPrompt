import type { Template, Field } from "@/data/types";
import type { Block, BlockDoc, BlockPreset } from "@/lib/blocks/types";
import type { Database } from "@/lib/supabase/types";
import type { IconName } from "@/components/iconNames";
import type {
  ContentBlock,
  InputBlock,
  TemplateBlock,
  TemplateDefinition,
  TemplateDocument,
} from "./model";
import { TEMPLATE_SCHEMA_VERSION } from "./model";
import { parseTemplateDocument } from "./schema";

function inputType(field: Field): InputBlock["input_type"] {
  if (field.type === "textarea") return "long_text";
  if (field.type === "select" || field.type === "pills") return "single_choice";
  return "short_text";
}

function purpose(preset: BlockPreset): ContentBlock["purpose"] {
  if (preset === "role" || preset === "persona") return "role";
  if (preset === "context" || preset === "knowledge" || preset === "audience") return "context";
  if (preset === "constraints" || preset === "system_rules") return "constraints";
  if (preset === "examples") return "example";
  if (preset === "output" || preset === "evaluation") return "output";
  return "instruction";
}

export function documentFromClassicTemplate(template: Template): TemplateDocument {
  const blocks: TemplateBlock[] = [
    {
      id: "content-base",
      kind: "content",
      purpose: "instruction",
      body: template.base_prompt,
      enabled: true,
    },
    ...template.fields.map((field) => ({
      id: field.id,
      kind: "input" as const,
      input_type: inputType(field),
      presentation:
        field.type === "select" ? ("dropdown" as const) : field.type === "pills" ? ("pills" as const) : undefined,
      label: field.label,
      helper: field.helper,
      placeholder: "placeholder" in field ? field.placeholder : undefined,
      required: Boolean(field.required),
      options: "options" in field ? field.options : undefined,
      prompt_prefix: field.prefix,
      suggested_answer: field.default,
      enabled: true,
    })),
    ...template.checkboxes.map((toggle) => ({
      id: toggle.id,
      kind: "optional_toggle" as const,
      label: toggle.label,
      helper: toggle.sub,
      injected_text: toggle.injected_text,
      suggested_selected: toggle.default,
      enabled: true,
    })),
  ];
  return { schema_version: TEMPLATE_SCHEMA_VERSION, blocks, form_groups: [] };
}

export function curatedTemplateDefinition(template: Template): TemplateDefinition {
  return {
    identity: { template_key: `curated:${template.id}`, source_kind: "curated" },
    metadata: {
      title: template.seo_title,
      outcome: template.blurb,
      category: template.category,
      icon: template.icon,
      slug: template.slug,
    },
    document: documentFromClassicTemplate(template),
    revision: {
      template_key: `curated:${template.id}`,
      source_kind: "curated",
      content_revision: 1,
    },
    publication: { visibility: "public", share_slug: template.slug },
    provenance: { source_surface: "curated_catalog" },
    capabilities: { can_edit: false, can_publish: false, can_remix: true },
  };
}

export function documentFromBlockDoc(doc: BlockDoc): TemplateDocument {
  const blocks: TemplateBlock[] = [];
  const form_groups: TemplateDocument["form_groups"] = [];
  let activeGroup: string | undefined;
  for (const block of doc.blocks) {
      if (block.kind === "form_group") {
        activeGroup = block.enabled ? block.id : undefined;
        if (block.enabled) form_groups.push({ id: block.id, title: block.title, description: block.description });
        continue;
      }
      if (block.kind === "section") {
        activeGroup = undefined;
        blocks.push({
          id: block.id,
          kind: "content",
          purpose: purpose(block.preset),
          heading: block.heading || undefined,
          body: block.body,
          enabled: block.enabled,
          separate_from_previous: true,
        });
        continue;
      }
      if (block.kind === "variable") {
        blocks.push({
          id: block.id,
          kind: "input",
          input_type: inputType(block.field),
          presentation:
            block.field.type === "select"
              ? "dropdown"
              : block.field.type === "pills"
                ? "pills"
                : undefined,
          label: block.field.label,
          helper: block.field.helper,
          placeholder: "placeholder" in block.field ? block.field.placeholder : undefined,
          required: Boolean(block.field.required),
          options: "options" in block.field ? block.field.options : undefined,
          prompt_prefix: block.field.prefix.replace(/^\n+/, ""),
          suggested_answer: block.value || block.field.default,
          enabled: block.enabled,
          separate_from_previous: true,
          group_id: activeGroup,
        });
        continue;
      }
      if (block.kind === "optional_toggle") {
        blocks.push({
          id: block.id,
          kind: "optional_toggle",
          label: block.label,
          helper: block.helper,
          injected_text: block.injectedText.trim(),
          suggested_selected: block.suggestedSelected,
          enabled: block.enabled,
          separate_from_previous: true,
          group_id: activeGroup,
        });
        continue;
      }
      if (block.kind === "note") {
        activeGroup = undefined;
        blocks.push({ id: block.id, kind: "note", text: block.text, enabled: block.enabled });
        continue;
      }
      activeGroup = undefined;
      blocks.push({ id: block.id, kind: "divider", enabled: block.enabled, separate_from_previous: true });
  }
  return { schema_version: TEMPLATE_SCHEMA_VERSION, form_groups, blocks };
}

export function notebookTemplateDefinition(input: {
  id: string;
  name: string;
  doc: BlockDoc;
  visibility: "private" | "public";
  shareSlug: string | null;
  revisionId?: string;
  canEdit?: boolean;
  outcome?: string;
  category?: string;
  icon?: IconName;
}): TemplateDefinition {
  return {
    identity: { template_key: `user:${input.id}`, source_kind: "user" },
    metadata: {
      title: input.name || "Untitled Template",
      outcome: input.outcome ?? "Fill the reusable inputs to generate a Prompt.",
      category: input.category ?? "work",
      icon: input.icon ?? "briefcase",
      slug: input.shareSlug,
    },
    document: documentFromBlockDoc(input.doc),
    revision: {
      template_key: `user:${input.id}`,
      source_kind: "user",
      revision_id: input.revisionId ?? `legacy-notebook-${input.id}`,
    },
    publication: { visibility: input.visibility, share_slug: input.shareSlug },
    provenance: {
      source_surface: input.visibility === "public" ? "community_public" : "owned_private",
      legacy_source_ref: {
        source_kind: "prompt_notebook",
        source_id: input.id,
        source_slug: input.shareSlug,
        source_schema: 1,
      },
    },
    capabilities: { can_edit: input.canEdit ?? false, can_publish: input.canEdit ?? false, can_remix: input.visibility === "public" },
  };
}

export function blockDocFromTemplateDocument(document: TemplateDocument, title: string): BlockDoc {
  const mapped: Block[] = document.blocks.map((block): Block => {
    const collapsed = false;
    if (block.kind === "content") {
      const preset: BlockPreset =
        block.purpose === "role" ? "role" :
        block.purpose === "context" ? "context" :
        block.purpose === "constraints" ? "constraints" :
        block.purpose === "example" ? "examples" :
        block.purpose === "output" ? "output" : "instructions";
      return { id: block.id, kind: "section", preset, heading: block.heading ?? "", body: block.body, enabled: block.enabled, collapsed };
    }
    if (block.kind === "input") {
      const field: Field = block.input_type === "single_choice"
        ? {
            id: block.id,
            type: block.presentation === "pills" ? "pills" : "select",
            label: block.label,
            helper: block.helper,
            required: block.required,
            options: block.options ?? [],
            prefix: block.prompt_prefix,
            default: block.suggested_answer,
          }
        : {
            id: block.id,
            type: block.input_type === "long_text" ? "textarea" : "text",
            label: block.label,
            helper: block.helper,
            placeholder: block.placeholder,
            required: block.required,
            prefix: block.prompt_prefix,
            default: block.suggested_answer,
          };
      return { id: block.id, kind: "variable", field, value: block.suggested_answer ?? "", enabled: block.enabled, collapsed };
    }
    if (block.kind === "optional_toggle") {
      return {
        id: block.id,
        kind: "optional_toggle",
        label: block.label,
        helper: block.helper,
        injectedText: block.injected_text,
        suggestedSelected: Boolean(block.suggested_selected),
        enabled: block.enabled,
        collapsed,
      };
    }
    if (block.kind === "note") return { id: block.id, kind: "note", text: block.text, enabled: block.enabled, collapsed };
    return { id: block.id, kind: "divider", enabled: block.enabled, collapsed };
  });
  const groups = new Map(document.form_groups.map((group) => [group.id, group]));
  const inserted = new Set<string>();
  const blocks: Block[] = [];
  document.blocks.forEach((source, index) => {
    if ((source.kind === "input" || source.kind === "optional_toggle") && source.group_id && !inserted.has(source.group_id)) {
      const group = groups.get(source.group_id);
      if (group) {
        blocks.push({ id: group.id, kind: "form_group", title: group.title, description: group.description, enabled: true, collapsed: false });
        inserted.add(group.id);
      }
    }
    blocks.push(mapped[index]);
  });
  return { version: 1, title, blocks };
}

type UserTemplateRow = Database["public"]["Tables"]["user_templates"]["Row"];

export function userTemplateDefinition(row: UserTemplateRow): TemplateDefinition {
  const stored = "document" in row ? parseTemplateDocument(row.document) : null;
  const classic: Template = {
    id: row.id,
    slug: row.slug ?? row.id,
    category: row.category,
    tag: row.tag ?? "",
    icon: row.icon as Template["icon"],
    seo_title: row.title,
    seo_description: row.blurb ?? "",
    blurb: row.blurb ?? "",
    intro: row.intro ?? "",
    uses: "",
    base_prompt: row.base_prompt,
    fields: row.fields as unknown as Template["fields"],
    checkboxes: row.checkboxes as unknown as Template["checkboxes"],
  };
  const revisionId = `editable-${"edit_version" in row ? row.edit_version : 1}`;
  return {
    identity: { template_key: `user:${row.id}`, source_kind: "user" },
    metadata: {
      title: row.title,
      outcome: row.blurb ?? "",
      category: row.category,
      icon: row.icon as Template["icon"],
      slug: row.share_slug ?? row.slug,
    },
    document: stored?.ok ? stored.value : documentFromClassicTemplate(classic),
    revision: { template_key: `user:${row.id}`, source_kind: "user", revision_id: revisionId },
    publication: {
      visibility: row.visibility,
      published_revision_id: "published_revision_id" in row ? row.published_revision_id : null,
      share_slug: row.share_slug,
      deleted_at: "deleted_at" in row ? row.deleted_at : null,
    },
    provenance: {
      source_surface: "owned_private",
      legacy_source_ref: {
        source_kind: "user_template",
        source_id: row.id,
        source_slug: row.slug,
        source_schema: 1,
      },
    },
    capabilities: { can_edit: true, can_publish: true, can_remix: row.visibility === "public" },
  };
}

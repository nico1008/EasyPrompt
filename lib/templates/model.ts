import type { IconName } from "@/components/iconNames";

export const TEMPLATE_SCHEMA_VERSION = 1 as const;

export type TemplateSourceKind = "curated" | "user";
export type TemplateSourceSurface = "curated_catalog" | "community_public" | "owned_private";
export type TemplateKey = `curated:${string}` | `user:${string}`;

export type CuratedRevisionRef = {
  template_key: `curated:${string}`;
  source_kind: "curated";
  content_revision: number;
};

export type UserRevisionRef = {
  template_key: `user:${string}`;
  source_kind: "user";
  revision_id: string;
};

export type TemplateRevisionRef = CuratedRevisionRef | UserRevisionRef;

export type TemplateRef = {
  template_key: TemplateKey;
  source_kind: TemplateSourceKind;
};

export type FormGroup = {
  id: string;
  title: string;
  description?: string;
};

type BlockCommon = {
  id: string;
  enabled: boolean;
  /** Internal output policy used by adapters for paragraph-joined legacy documents. */
  separate_from_previous?: boolean;
};

export type ContentBlock = BlockCommon & {
  kind: "content";
  purpose: "instruction" | "role" | "context" | "constraints" | "example" | "output";
  heading?: string;
  body: string;
};

export type InputBlock = BlockCommon & {
  kind: "input";
  input_type: "short_text" | "long_text" | "single_choice";
  presentation?: "dropdown" | "pills";
  label: string;
  helper?: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  prompt_prefix: string;
  prompt_suffix?: string;
  suggested_answer?: string;
  group_id?: string;
};

export type OptionalToggleBlock = BlockCommon & {
  kind: "optional_toggle";
  label: string;
  helper?: string;
  injected_text: string;
  suggested_selected?: boolean;
  group_id?: string;
};

export type NoteBlock = BlockCommon & {
  kind: "note";
  text: string;
};

export type DividerBlock = BlockCommon & {
  kind: "divider";
};

export type TemplateBlock =
  | ContentBlock
  | InputBlock
  | OptionalToggleBlock
  | NoteBlock
  | DividerBlock;

export type TemplateDocument = {
  schema_version: typeof TEMPLATE_SCHEMA_VERSION;
  blocks: TemplateBlock[];
  form_groups: FormGroup[];
};

export type TemplateMetadata = {
  title: string;
  outcome: string;
  category: string;
  icon: IconName;
  slug: string | null;
  creator_nickname?: string;
};

export type TemplateDefinition = {
  identity: TemplateRef;
  metadata: TemplateMetadata;
  document: TemplateDocument;
  revision: TemplateRevisionRef;
  publication: {
    visibility: "private" | "public";
    published_revision_id?: string | null;
    share_slug?: string | null;
    deleted_at?: string | null;
  };
  provenance: {
    source_surface: TemplateSourceSurface;
    legacy_source_ref?: {
      source_kind: "prompt_notebook" | "user_template";
      source_id: string;
      source_slug?: string | null;
      source_schema: number;
    };
  };
  capabilities: {
    can_edit: boolean;
    can_publish: boolean;
    can_remix: boolean;
  };
};

export type TemplateAnswers = Record<string, string | boolean>;

export function blankTemplateAnswers(document: TemplateDocument): TemplateAnswers {
  const answers: TemplateAnswers = {};
  for (const block of document.blocks) {
    if (block.kind === "input") answers[block.id] = "";
    if (block.kind === "optional_toggle") answers[block.id] = false;
  }
  return answers;
}

export function suggestedTemplateAnswers(document: TemplateDocument): TemplateAnswers {
  const answers: TemplateAnswers = {};
  for (const block of document.blocks) {
    if (block.kind === "input") answers[block.id] = block.suggested_answer ?? "";
    if (block.kind === "optional_toggle") answers[block.id] = Boolean(block.suggested_selected);
  }
  return answers;
}

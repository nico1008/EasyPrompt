import { buildPromptFromBlocks } from "@/lib/buildPrompt";
import { blockDocSchema } from "@/lib/blocks/schema";
import type { BlockDoc } from "@/lib/blocks/types";
import type { Template } from "@/data/types";
import type { Database } from "@/lib/supabase/types";
import { inputToTemplate, userTemplateInputSchema } from "@/lib/userTemplates/validate";
import type { CommunityAuthor } from "./map";
import type { TemplateDefinition } from "@/lib/templates/model";

type CommunityTemplateRow =
  Database["public"]["Functions"]["community_template"]["Returns"][number];

type CommunityTemplateBase = {
  title: string;
  text: string;
  blurb: string;
  visibility: "public";
  author: CommunityAuthor | null;
};

export type CommunityTemplateDetail =
  | (CommunityTemplateBase & { kind: "canonical"; definition: TemplateDefinition })
  | (CommunityTemplateBase & { kind: "user_template"; template: Template })
  | (CommunityTemplateBase & { kind: "notebook"; doc: BlockDoc });

function firstUsefulLine(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .find((line) => line.trim() && !line.startsWith("#"))
    ?.trim();
}

export function communityTemplateFromRow(
  slug: string,
  row: CommunityTemplateRow
): CommunityTemplateDetail | null {
  const author = row.author_username ? { username: row.author_username } : null;

  if (row.kind === "notebook") {
    const payload = row.payload as { doc?: unknown };
    const parsed = blockDocSchema.safeParse(payload.doc);
    if (!parsed.success) return null;
    const doc = parsed.data as unknown as BlockDoc;
    const text = buildPromptFromBlocks(doc).text;
    return {
      kind: "notebook",
      title: row.title,
      text,
      blurb: firstUsefulLine(text) ?? "A reusable community Template.",
      doc,
      visibility: "public",
      author,
    };
  }

  const payload = row.payload as Record<string, unknown>;
  const parsed = userTemplateInputSchema.safeParse({
    title: row.title,
    category: payload.category,
    icon: payload.icon,
    tag: payload.tag ?? "",
    blurb: payload.blurb ?? "",
    intro: payload.intro ?? "",
    base_prompt: payload.base_prompt,
    fields: payload.fields ?? [],
    checkboxes: payload.checkboxes ?? [],
  });
  if (!parsed.success) return null;

  const template = inputToTemplate(parsed.data);
  template.id = `community-${slug}`;
  template.slug = slug;
  return {
    kind: "user_template",
    title: row.title,
    text: template.base_prompt,
    blurb: template.blurb || "A reusable community Template.",
    template,
    visibility: "public",
    author,
  };
}

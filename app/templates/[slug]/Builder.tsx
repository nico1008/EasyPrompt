"use client";

import type { Template } from "@/data/types";
import { displayTitle, categoryLabel } from "@/data/templates";
import type { Answers } from "@/lib/buildPrompt";
import type { BreadcrumbItem } from "@/components/Breadcrumbs";
import type { SaveSource } from "@/components/SavePromptButton";
import { WorkflowContextBar } from "@/components/WorkflowContextBar";
import type { WorkflowReturnContext } from "@/lib/workflows/context";
import type { EcosystemLink } from "@/data/ecosystem";
import type { Creator } from "@/lib/browse/types";
import type { BookmarkTarget } from "@/lib/bookmarks/schema";
import type { TemplateAnswers, TemplateDefinition } from "@/lib/templates/model";
import { curatedTemplateDefinition, documentFromClassicTemplate } from "@/lib/templates/adapters";
import { UnifiedTemplateFill } from "@/components/templates/UnifiedTemplateFill";

type RelatedLite = { slug: string; title: string; category: string; questions: number };

function canonicalAnswers(template: Template, answers?: Answers): TemplateAnswers | undefined {
  if (!answers) return undefined;
  return Object.fromEntries([
    ...template.fields.map((field) => [field.id, answers.fields[field.id] ?? ""] as const),
    ...template.checkboxes.map((toggle) => [toggle.id, Boolean(answers.checks[toggle.id])] as const),
  ]);
}
function definitionForLegacyProps(template: Template, source?: SaveSource): TemplateDefinition {
  if (source?.kind !== "user") return curatedTemplateDefinition(template);
  return {
    identity: { template_key: `user:${source.userTemplateId}`, source_kind: "user" },
    metadata: {
      title: template.seo_title,
      outcome: template.blurb,
      category: template.category,
      icon: template.icon,
      slug: template.slug,
    },
    document: documentFromClassicTemplate(template),
    revision: {
      template_key: `user:${source.userTemplateId}`,
      source_kind: "user",
      revision_id: `editable-${source.userTemplateId}`,
    },
    publication: { visibility: "private" },
    provenance: { source_surface: "owned_private" },
    capabilities: { can_edit: true, can_publish: true, can_remix: false },
  };
}

/** Compatibility shell while callers move from storage-specific Templates to TemplateDefinition. */
export function Builder({
  template,
  initialAnswers,
  source,
  crumbs,
  workflowContext,
  bookmarkTarget,
  ownerEditHref,
  definition,
}: {
  template: Template;
  related: RelatedLite[];
  initialAnswers?: Answers;
  source?: SaveSource;
  savedPromptId?: string;
  saveDefaultName?: string;
  crumbs?: BreadcrumbItem[];
  restoreDrafts?: boolean;
  workflowContext?: WorkflowReturnContext | null;
  ecosystemLinks?: EcosystemLink[];
  creator?: Creator;
  bookmarkTarget?: BookmarkTarget;
  saveAsStandalone?: boolean;
  ownerEditHref?: string;
  definition?: TemplateDefinition;
}) {
  const canonical = definition ?? definitionForLegacyProps(template, source);
  const breadcrumbs = crumbs ?? [
    { href: "/templates", label: "Templates" },
    { href: `/templates?category=${template.category}`, label: categoryLabel(template.category) },
    { label: displayTitle(template) },
  ];
  const favorite = bookmarkTarget ?? (source?.kind === "catalog"
    ? { kind: "catalog" as const, key: source.slug }
    : undefined);

  return (
    <>
      {workflowContext && <WorkflowContextBar context={workflowContext} />}
      <UnifiedTemplateFill
        definition={canonical}
        breadcrumbs={breadcrumbs}
        source={source ?? { kind: "catalog", slug: template.slug }}
        initialAnswers={canonicalAnswers(template, initialAnswers)}
        bookmarkTarget={favorite}
        ownerEditHref={ownerEditHref}
      />
    </>
  );
}

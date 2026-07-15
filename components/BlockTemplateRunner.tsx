"use client";

import { useMemo } from "react";
import type { BreadcrumbItem } from "@/components/Breadcrumbs";
import type { BlockDoc } from "@/lib/blocks/types";
import type { CommunityAuthor } from "@/lib/community/map";
import { UnifiedTemplateFill } from "@/components/templates/UnifiedTemplateFill";
import { notebookTemplateDefinition } from "@/lib/templates/adapters";

/** Compatibility adapter for legacy block-built Templates during migration. */
export function BlockTemplateRunner({
  title,
  doc,
  fileKey,
  breadcrumbs,
  publicContext,
  ownerEditHref,
}: {
  title: string;
  doc: BlockDoc;
  fileKey: string;
  breadcrumbs: BreadcrumbItem[];
  publicContext?: { slug: string; author: CommunityAuthor | null };
  ownerEditHref?: string;
}) {
  const definition = useMemo(
    () => notebookTemplateDefinition({
      id: fileKey,
      name: title,
      doc,
      visibility: publicContext ? "public" : "private",
      shareSlug: publicContext?.slug ?? null,
      canEdit: Boolean(ownerEditHref),
    }),
    [doc, fileKey, ownerEditHref, publicContext, title]
  );

  return (
    <UnifiedTemplateFill
      definition={definition}
      breadcrumbs={breadcrumbs}
      bookmarkTarget={publicContext ? { kind: "user_template", key: publicContext.slug } : undefined}
      ownerEditHref={ownerEditHref}
    />
  );
}

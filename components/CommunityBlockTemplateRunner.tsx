import { BlockTemplateRunner } from "@/components/BlockTemplateRunner";
import type { BlockDoc } from "@/lib/blocks/types";
import type { CommunityAuthor } from "@/lib/community/map";

export function CommunityBlockTemplateRunner({
  slug,
  title,
  doc,
  author,
}: {
  slug: string;
  title: string;
  doc: BlockDoc;
  author: CommunityAuthor | null;
}) {
  return (
    <BlockTemplateRunner
      title={title}
      doc={doc}
      fileKey={slug}
      breadcrumbs={[{ href: "/templates", label: "Templates" }, { label: title }]}
      publicContext={{ slug, author }}
    />
  );
}

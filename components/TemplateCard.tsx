"use client";

import Link from "next/link";
import { Icon } from "./Icon";
import { BookmarkButton } from "./BookmarkButton";
import { objectMeta } from "@/lib/library/objectMeta";
import { useImpression } from "@/lib/metrics/useImpression";
import type { Aggregate } from "@/lib/ratings/map";
import type { BrowseTemplateItem } from "@/lib/browse/types";
import { CreatorChip } from "./CreatorChip";

/* Light picker tile for the Templates grid — one shape for both house and community
   templates. The title is a stretched link (the whole tile navigates: house → the
   fill-in builder, community → the public preview) so the Favorite, rating, and the
   creator chip stay independently interactive without nesting anchors. Rating +
   question count are house-only (community templates carry neither yet). An
   impression records a `view`; `uses` comes from the grid's batch fetch. */
export function TemplateCard({
  item,
}: {
  item: BrowseTemplateItem;
  uses?: number;
  rating?: Aggregate;
}) {
  const ref = useImpression<HTMLElement>({ kind: item.metricKind, key: item.slug });
  return (
    <article ref={ref} className={`tpl-tile${item.popular ? " popular" : ""}`}>
      <div className="tt-bar">
        <span className="tt-glyph" aria-hidden="true">
          <Icon name={objectMeta("template").icon} size={14} />
        </span>
        <h3 className="tt-name">
          <Link className="tt-namelink" href={item.href} aria-label={item.title}>
            {item.title}
          </Link>
        </h3>
        {item.popular && (
          <span className="tt-pop" title="Most popular" aria-label="Most popular">
            <Icon name="star" size={12} />
          </span>
        )}
        {item.bookmark && (
          <span className="tt-fav">
            <BookmarkButton compact target={item.bookmark} />
          </span>
        )}
      </div>
      <div className="tt-body">
        <p className="tt-blurb">{item.blurb}</p>
      </div>
      <div className="tt-foot">
        <span className="tt-tag">{item.category ?? item.tag}</span>
        <span className="tt-meta">
          {item.origin === "community" && <CreatorChip creator={item.creator} compact />}
          <span className="tt-q">{item.questionCount != null ? `${item.questionCount} inputs` : "Quick fill"}</span>
        </span>
      </div>
      <span className="tt-use" aria-hidden="true">Use Template <Icon name="arrow-right" size={13} /></span>
    </article>
  );
}

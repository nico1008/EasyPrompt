"use client";

import Link from "next/link";
import { Icon } from "./Icon";
import { UsesBadge } from "./UsesBadge";
import { AuthorChip } from "./AuthorChip";
import { objectMeta } from "@/lib/library/objectMeta";
import { useImpression } from "@/lib/metrics/useImpression";
import type { CommunityCard as CommunityCardModel } from "@/lib/community/map";

/* A public user Prompt/Template tile for the "From the community" sections and
 * profiles. Uses a stretched-link pattern (.cc-titlelink::after covers the card) so
 * the whole tile is clickable while the AuthorChip + UsesBadge stay independently
 * interactive — no nested <a>. An impression fires a `view`; `uses` is supplied by
 * the parent's batch fetch. */
export function CommunityCard({
  card,
  uses,
}: {
  card: CommunityCardModel;
  uses?: number;
}) {
  const metricKind = card.objectType === "prompt" ? "user_prompt" : "user_template";
  const ref = useImpression<HTMLElement>({ kind: metricKind, key: card.slug });

  return (
    <article ref={ref} className={`community-card cc-${card.objectType}`}>
      <div className="cc-bar">
        <span className="cc-glyph" aria-hidden="true">
          <Icon name={objectMeta(card.objectType).icon} size={14} />
        </span>
        <h3 className="cc-title">
          <Link className="cc-titlelink" href={card.href}>
            {card.title}
          </Link>
        </h3>
      </div>
      <p className="cc-blurb">{card.blurb}</p>
      <div className="cc-foot">
        <span className="cc-tag">{card.tag}</span>
        <span className="cc-meta">
          <AuthorChip author={card.author} />
          <UsesBadge target={{ kind: metricKind, key: card.slug }} count={uses} managed />
        </span>
      </div>
    </article>
  );
}

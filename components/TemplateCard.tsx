"use client";

import Link from "next/link";
import type { Template } from "@/data/types";
import { displayTitle, questionCount } from "@/data/templates";
import { Icon } from "./Icon";
import { RatingStars } from "./RatingStars";
import { BookmarkButton } from "./BookmarkButton";
import { UsesBadge } from "./UsesBadge";
import { objectMeta } from "@/lib/library/objectMeta";
import { useImpression } from "@/lib/metrics/useImpression";

/* Picker grid card — a light tile that mirrors the dark Prompt tile's architecture
   (header bar -> body -> footer) so the two catalogs read as one family, while
   keeping the Templates identity: indigo, a sans title, and the Template object
   glyph. The title lives in the header bar; the footer carries the template meta
   (Uses + rating + question count) — the analog of the Prompt card's Copy action.
   The "popular" variant adds an indigo top edge + a star in the bar. The whole card
   links to the builder; the Favorite toggle stops propagation so a tap saves
   without navigating. An impression fires a `view` (the copy-through denominator);
   `uses` is supplied by the grid's batch fetch. */
export function TemplateCard({ t, uses }: { t: Template; uses?: number }) {
  const ref = useImpression<HTMLAnchorElement>({ kind: "catalog", key: t.slug });
  return (
    <Link
      ref={ref}
      className={`tpl-tile${t.popular ? " popular" : ""}`}
      href={`/templates/${t.slug}`}
      aria-label={displayTitle(t)}
    >
      <div className="tt-bar">
        <span className="tt-glyph" aria-hidden="true">
          <Icon name={objectMeta("template").icon} size={14} />
        </span>
        <h3 className="tt-name">{displayTitle(t)}</h3>
        {t.popular && (
          <span className="tt-pop" title="Most popular" aria-label="Most popular">
            <Icon name="star" size={12} />
          </span>
        )}
        <span className="tt-fav">
          <BookmarkButton compact target={{ kind: "catalog", key: t.slug }} />
        </span>
      </div>
      <div className="tt-body">
        <p className="tt-blurb">{t.blurb}</p>
      </div>
      <div className="tt-foot">
        <span className="tt-tag">{t.tag}</span>
        <span className="tt-meta">
          <UsesBadge target={{ kind: "catalog", key: t.slug }} count={uses} managed />
          <RatingStars target={{ kind: "catalog", key: t.slug }} compact />
          <span className="tt-q">{questionCount(t)} questions</span>
        </span>
      </div>
    </Link>
  );
}

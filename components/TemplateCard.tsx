import Link from "next/link";
import type { Template } from "@/data/types";
import { displayTitle, questionCount } from "@/data/templates";
import { Icon } from "./Icon";
import { RatingStars } from "./RatingStars";

/* Picker grid card. A plain panel (the crosshair signature is reserved for
   focal hero/payoff moments). The "popular" variant adds an indigo top edge
   + star. The whole card is a link to the builder. */
export function TemplateCard({ t }: { t: Template }) {
  return (
    <Link className={`card panel${t.popular ? " popular" : ""}`} href={`/prompts/${t.slug}`}>
      <div className="top">
        <h3>{displayTitle(t)}</h3>
        <div className="icon">
          <Icon name={t.icon} size={18} />
        </div>
      </div>
      <p>{t.blurb}</p>
      <div className="foot">
        {t.popular ? (
          <span className="star">
            <Icon name="star" size={11} />
            Most popular
          </span>
        ) : (
          <span className="tag">{t.tag}</span>
        )}
        <span className="foot-right">
          <RatingStars target={{ kind: "catalog", key: t.slug }} compact />
          <span className="uses">{questionCount(t)} questions</span>
        </span>
      </div>
    </Link>
  );
}

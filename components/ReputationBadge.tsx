import { Icon } from "./Icon";

/* Trust signal derived from real usage of an author's published content (distinct,
 * deduped actors, per-item capped — see public_profile()). Deliberately a *tier*,
 * not a raw number race: it appears only past a threshold and reads as a label. */
const THRESHOLD = 10;

export function ReputationBadge({ reputation }: { reputation: number }) {
  if (!reputation || reputation < THRESHOLD) return null;
  const tier =
    reputation >= 200 ? "Top contributor" : reputation >= 50 ? "Trusted contributor" : "Contributor";
  return (
    <span
      className="reputation-badge"
      title={`${reputation} people found this author's published work useful`}
    >
      <Icon name="shield" size={13} />
      {tier}
    </span>
  );
}

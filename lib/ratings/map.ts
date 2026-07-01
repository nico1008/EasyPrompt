/* Pure normalization for a rating aggregate. The rating_aggregate() RPC returns
 * postgres `numeric` (often a string over the wire) and `bigint`; this maps it to
 * a clean { avg: 1-dp number, count: int }. Shared by the repo, the action, the
 * client read helper, and tests. */

export type Aggregate = { avg: number; count: number };
export type AggregateRecord = Record<string, Aggregate>;

export const EMPTY_AGGREGATE: Aggregate = { avg: 0, count: 0 };

function toNumber(v: number | string | null | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function rowToAggregate(raw: {
  avg: number | string | null;
  count: number | string | null;
}): Aggregate {
  const avg = Math.round(toNumber(raw.avg) * 10) / 10;
  const count = Math.max(0, Math.trunc(toNumber(raw.count)));
  return { avg, count };
}

/* Repositioned rating display (audit Phase 1): ratings are a secondary, low-volume
 * signal, so a headline average is gated behind a minimum number of ratings and
 * Bayesian-shrunk toward a prior mean — a single 5★ no longer reads as "5.0", and
 * the displayed number is robust to small samples. Pure (no query): the shrink is
 * computed from avg + count we already have. Returns the 1-dp number to show, or
 * null when there aren't enough ratings yet. */
export function displayRating(
  agg: Aggregate,
  opts: { minCount?: number; priorMean?: number; priorWeight?: number } = {}
): number | null {
  const minCount = opts.minCount ?? 3;
  const priorMean = opts.priorMean ?? 4;
  const priorWeight = opts.priorWeight ?? 3;
  if (agg.count < minCount) return null;
  const shrunk =
    (priorWeight * priorMean + agg.avg * agg.count) / (priorWeight + agg.count);
  return Math.round(shrunk * 10) / 10;
}

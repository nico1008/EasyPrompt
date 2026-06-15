/* Pure normalization for a rating aggregate. The rating_aggregate() RPC returns
 * postgres `numeric` (often a string over the wire) and `bigint`; this maps it to
 * a clean { avg: 1-dp number, count: int }. Shared by the repo, the action, the
 * client read helper, and tests. */

export type Aggregate = { avg: number; count: number };

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

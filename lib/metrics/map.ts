/* Pure normalization for usage counts. The content_stats_get / content_stats_batch
 * RPCs return postgres `bigint` (often a string over the wire); this maps a row to
 * a clean { uses: int, views: int }. Shared by the client read helpers and tests. */

export type Counts = { uses: number; views: number };
export type CountsRecord = Record<string, Counts>;

export const EMPTY_COUNTS: Counts = { uses: 0, views: 0 };

function toNumber(v: number | string | null | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function rowToCounts(raw: {
  uses: number | string | null;
  views: number | string | null;
}): Counts {
  return {
    uses: Math.max(0, Math.trunc(toNumber(raw.uses))),
    views: Math.max(0, Math.trunc(toNumber(raw.views))),
  };
}

/* Compact count formatting for the Uses badge — GitHub-style: 1234 → "1.2k",
 * 1_200_000 → "1.2M". Pure + unit-tested. */

function trim(x: number): string {
  // One decimal, dropping a trailing ".0" (so 1000 → "1k", not "1.0k").
  const s = (Math.round(x * 10) / 10).toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

export function compactNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  const abs = Math.trunc(n);
  if (abs < 1_000) return String(abs);
  if (abs < 1_000_000) return `${trim(abs / 1_000)}k`;
  if (abs < 1_000_000_000) return `${trim(abs / 1_000_000)}M`;
  return `${trim(abs / 1_000_000_000)}B`;
}

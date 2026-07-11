export function catalogUrlPath(
  currentHref: string,
  values: Record<string, string>,
  defaults: Record<string, string>
) {
  const url = new URL(currentHref);
  for (const [key, value] of Object.entries(values)) {
    if (!value || value === defaults[key]) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

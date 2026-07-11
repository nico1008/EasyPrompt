export type BrowseDestination = "templates" | "prompts" | "workflows";
export type PrimaryNavSection = "browse" | "build" | "library";

/** Match a route at a segment boundary so `/templates-old` is never a Template route. */
export function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function activeBrowseDestination(pathname: string): BrowseDestination | null {
  if (matchesRoute(pathname, "/templates") || matchesRoute(pathname, "/p")) {
    return "templates";
  }
  if (matchesRoute(pathname, "/prompts")) return "prompts";
  if (matchesRoute(pathname, "/workflows")) return "workflows";
  return null;
}

export function activePrimaryNavSection(pathname: string): PrimaryNavSection | null {
  if (activeBrowseDestination(pathname)) return "browse";
  if (matchesRoute(pathname, "/build")) return "build";
  if (matchesRoute(pathname, "/my")) return "library";
  return null;
}

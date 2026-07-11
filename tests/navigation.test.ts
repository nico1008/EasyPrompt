import { describe, expect, it } from "vitest";
import {
  activeBrowseDestination,
  activePrimaryNavSection,
  matchesRoute,
} from "@/lib/navigation";

describe("navigation route matching", () => {
  it("matches route roots and descendants at segment boundaries", () => {
    expect(matchesRoute("/templates", "/templates")).toBe(true);
    expect(matchesRoute("/templates/weekly-planner", "/templates")).toBe(true);
    expect(matchesRoute("/templates-old", "/templates")).toBe(false);
  });

  it.each([
    ["/templates", "templates"],
    ["/templates/weekly-planner", "templates"],
    ["/p/community-template", "templates"],
    ["/prompts", "prompts"],
    ["/prompts/review-code", "prompts"],
    ["/workflows", "workflows"],
    ["/workflows/launch-plan", "workflows"],
  ] as const)("maps %s to the %s Browse destination", (pathname, destination) => {
    expect(activeBrowseDestination(pathname)).toBe(destination);
    expect(activePrimaryNavSection(pathname)).toBe("browse");
  });

  it("keeps Build and My Library routes in their owning sections", () => {
    expect(activePrimaryNavSection("/build/prompt")).toBe("build");
    expect(activePrimaryNavSection("/my/prompts/123/edit")).toBe("library");
  });

  it.each(["/templates-old", "/prompt", "/builder", "/my-library"])(
    "does not match false prefix %s",
    (pathname) => {
      expect(activeBrowseDestination(pathname)).toBeNull();
      expect(activePrimaryNavSection(pathname)).toBeNull();
    }
  );
});

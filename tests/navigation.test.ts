import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activeBrowseDestination,
  activePrimaryNavSection,
  matchesRoute,
} from "@/lib/navigation";

const root = process.cwd();

function listSourceFiles(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const relativePath = join(dir, entry.name);
    return entry.isDirectory()
      ? listSourceFiles(relativePath)
      : /\.(ts|tsx)$/.test(entry.name)
        ? [relativePath]
        : [];
  });
}

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

  it("never prefixes a displayed username with @", () => {
    const files = [...listSourceFiles("app"), ...listSourceFiles("components"), "lib/bookmarks/resolve.ts"];
    const hits = files.flatMap((file) =>
      readFileSync(join(root, file), "utf8")
        .split("\n")
        .map((line, index) => ({ file: file.replace(/\\/g, "/"), line, number: index + 1 }))
        .filter(({ line }) => !line.trimStart().startsWith("import "))
        .filter(({ line }) => /username/i.test(line) && /@/.test(line))
        .map(({ file, line, number }) => `${file}:${number}: ${line.trim()}`)
    );

    expect(hits).toEqual([]);
  });
});

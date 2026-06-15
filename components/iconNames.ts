/* The icon vocabulary, as a runtime array + derived type. Kept JSX-free so it
 * can be imported anywhere (validators, server actions, tests) without pulling
 * the SVG component in. Icon.tsx re-exports `IconName` for existing callers. */

export const ICON_NAMES = [
  "meal",
  "letter",
  "lesson",
  "email",
  "house",
  "toast",
  "workout",
  "code",
  "review",
  "teacher",
  "chart",
  "briefcase",
  "search",
  "copy",
  "download",
  "share",
  "check",
  "star",
  "arrow-right",
  "menu",
  "zap",
  "clock",
  "bookmark",
  "plus",
  "trash",
  "chevron",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

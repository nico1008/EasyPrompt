/* One source of truth for how the two objects read at a glance. A Template is a
 * fill-in framework (a "form" glyph, indigo); a Prompt is ready-to-paste text (a
 * "terminal"/braces glyph, the prompt-accent green). Every type chip — My Library
 * rows, Builder recent rows, Favorites cards, the dark prompt cards — uses this so
 * users tell them apart without reading the label. Pure + unit-tested. */

import type { IconName } from "@/components/iconNames";
import type { LibraryObjectType } from "@/lib/library/list";

export type ObjectMeta = {
  icon: IconName;
  label: string;
  /** CSS tone hook: `obj-template` (indigo) | `obj-prompt` (prompt-accent). */
  tone: "obj-template" | "obj-prompt" | "obj-workflow";
};

export function objectMeta(objectType: LibraryObjectType): ObjectMeta {
  if (objectType === "workflow") return { icon: "book", label: "Workflow", tone: "obj-workflow" };
  return objectType === "template"
    ? { icon: "list", label: "Template", tone: "obj-template" }
    : { icon: "code", label: "Prompt", tone: "obj-prompt" };
}

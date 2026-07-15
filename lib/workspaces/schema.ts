import { z } from "zod";
import { bookmarkTargetSchema, type BookmarkTarget } from "@/lib/bookmarks/schema";
import type { LibraryInternal } from "@/lib/library/list";

const ownedKinds = ["notebook", "user_template", "saved_prompt", "user_workflow"] as const;
const ownedKindSchema = z.enum(ownedKinds);
const uuidSchema = z.string().uuid();

export const workspaceNameSchema = z.string().trim().min(1, "Enter a workspace name.").max(60, "Keep workspace names under 60 characters.");

export type ParsedLibraryItemKey =
  | { scope: "owned"; internal: LibraryInternal; id: string }
  | { scope: "favorite"; target: BookmarkTarget };

export function ownedLibraryItemKey(internal: LibraryInternal, id: string): string {
  return `owned:${internal}:${id}`;
}

export function favoriteLibraryItemKey(target: BookmarkTarget): string {
  return `favorite:${target.kind}:${target.key}`;
}

export function parseLibraryItemKey(value: string): ParsedLibraryItemKey | null {
  const parts = value.split(":");
  if (parts[0] === "owned" && parts.length === 3) {
    const kind = ownedKindSchema.safeParse(parts[1]);
    const id = uuidSchema.safeParse(parts[2]);
    return kind.success && id.success
      ? { scope: "owned", internal: kind.data, id: id.data }
      : null;
  }

  if (parts[0] === "favorite" && parts.length >= 3) {
    const target = bookmarkTargetSchema.safeParse({
      kind: parts[1],
      key: parts.slice(2).join(":"),
    });
    return target.success ? { scope: "favorite", target: target.data } : null;
  }

  return null;
}

export const libraryItemKeySchema = z
  .string()
  .trim()
  .min(3)
  .max(180)
  .refine((value) => parseLibraryItemKey(value) !== null, "Invalid library item.");

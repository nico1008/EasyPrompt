"use server";

/* Toggle a bookmark on/off. Authorizes with getUser(); RLS guarantees a user can
 * only touch their own rows and the unique (owner, target) constraint keeps it
 * idempotent. Returns the new state for optimistic UI and revalidates My Library
 * (/my — favorites render there under ?filter=favorites). */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getTemplate } from "@/data/templates";
import { getExamplePrompt } from "@/data/prompts";
import { bookmarkTargetSchema, type BookmarkTarget } from "./schema";

export type BookmarkState = { ok?: boolean; error?: string; bookmarked?: boolean };

export async function toggleBookmarkAction(target: BookmarkTarget): Promise<BookmarkState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't set up here." };

  const t = bookmarkTargetSchema.safeParse(target);
  if (!t.success) return { error: "Unknown bookmark target." };

  // Validate the target exists in the static catalog it claims to belong to.
  if (t.data.kind === "catalog" && !getTemplate(t.data.key))
    return { error: "Unknown template." };
  if (t.data.kind === "example_prompt" && !getExamplePrompt(t.data.key))
    return { error: "Unknown prompt." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to bookmark." };

  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("target_kind", t.data.kind)
    .eq("target_key", t.data.key)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("bookmarks").delete().eq("id", existing.id);
    if (error) return { error: "Couldn't update your library." };
    revalidatePath("/my");
    return { ok: true, bookmarked: false };
  }

  const { error } = await supabase
    .from("bookmarks")
    .insert({ owner_id: user.id, target_kind: t.data.kind, target_key: t.data.key });
  if (error) return { error: "Couldn't update your library." };
  revalidatePath("/my");
  return { ok: true, bookmarked: true };
}

/* Remove a bookmark by row id — form action for the My Library favorites tab. RLS
 * scopes the delete to the owner. No redirect: the form lives on /my, so
 * revalidatePath + the automatic post-action refresh updates the list in place
 * (redirecting to the current URL would dedupe and leave the list stale). */
export async function removeBookmarkAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/my");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/my");

  const supabase = await createClient();
  await supabase.from("bookmarks").delete().eq("id", id);
  revalidatePath("/my");
}

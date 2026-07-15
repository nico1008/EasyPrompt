"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  libraryItemKeySchema,
  parseLibraryItemKey,
  workspaceNameSchema,
} from "@/lib/workspaces/schema";

export type WorkspaceActionState = { ok?: boolean; error?: string };

const workspaceIdSchema = z.string().uuid();

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

async function itemExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemKey: string
): Promise<boolean> {
  const parsed = parseLibraryItemKey(itemKey);
  if (!parsed) return false;

  if (parsed.scope === "favorite") {
    const { data } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("target_kind", parsed.target.kind)
      .eq("target_key", parsed.target.key)
      .maybeSingle();
    return Boolean(data);
  }

  if (parsed.internal === "notebook") {
    const { data } = await supabase.from("prompt_notebooks").select("id").eq("id", parsed.id).maybeSingle();
    return Boolean(data);
  }
  if (parsed.internal === "user_template") {
    const { data } = await supabase.from("user_templates").select("id").eq("id", parsed.id).maybeSingle();
    return Boolean(data);
  }
  if (parsed.internal === "saved_prompt") {
    const { data } = await supabase.from("saved_prompts").select("id").eq("id", parsed.id).maybeSingle();
    return Boolean(data);
  }
  const { data } = await supabase.from("user_workflows").select("id").eq("id", parsed.id).maybeSingle();
  return Boolean(data);
}

export async function createWorkspaceAction(
  _previous: WorkspaceActionState,
  formData: FormData
): Promise<WorkspaceActionState> {
  const parsed = workspaceNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name." };

  const { supabase, user } = await authenticatedClient();
  if (!user) return { error: "Please log in again." };

  const { error } = await supabase.from("library_workspaces").insert({
    owner_id: user.id,
    name: parsed.data,
  });
  if (error?.code === "23505") return { error: "A workspace with that name already exists." };
  if (error) return { error: "Couldn't create the workspace. Please try again." };

  revalidatePath("/my");
  return { ok: true };
}
export async function renameWorkspaceAction(
  _previous: WorkspaceActionState,
  formData: FormData
): Promise<WorkspaceActionState> {
  const id = workspaceIdSchema.safeParse(formData.get("workspaceId"));
  const name = workspaceNameSchema.safeParse(formData.get("name"));
  if (!id.success || !name.success) return { error: name.success ? "Invalid workspace." : name.error.issues[0]?.message };

  const { supabase, user } = await authenticatedClient();
  if (!user) return { error: "Please log in again." };
  const { data, error } = await supabase
    .from("library_workspaces")
    .update({ name: name.data })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") return { error: "A workspace with that name already exists." };
  if (error || !data) return { error: "Couldn't rename the workspace." };
  revalidatePath("/my");
  return { ok: true };
}

export async function deleteWorkspaceAction(formData: FormData): Promise<void> {
  const id = workspaceIdSchema.safeParse(formData.get("workspaceId"));
  if (!id.success) return;
  const { supabase, user } = await authenticatedClient();
  if (!user) return;
  await supabase.from("library_workspaces").delete().eq("id", id.data);
  revalidatePath("/my");
}

export async function setWorkspaceItemAction(formData: FormData): Promise<WorkspaceActionState> {
  const workspaceId = workspaceIdSchema.safeParse(formData.get("workspaceId"));
  const itemKey = libraryItemKeySchema.safeParse(formData.get("itemKey"));
  const included = z.enum(["true", "false"]).safeParse(formData.get("included"));
  if (!workspaceId.success || !itemKey.success || !included.success) return { error: "Invalid request." };

  const { supabase, user } = await authenticatedClient();
  if (!user) return { error: "Please log in again." };

  const { data: workspace } = await supabase
    .from("library_workspaces")
    .select("id")
    .eq("id", workspaceId.data)
    .maybeSingle();
  if (!workspace) return { error: "Workspace not found." };

  if (included.data === "true") {
    if (!(await itemExists(supabase, itemKey.data))) return { error: "This item is no longer in your library." };
    const { error } = await supabase.from("library_workspace_items").upsert(
      { workspace_id: workspaceId.data, owner_id: user.id, item_key: itemKey.data },
      { onConflict: "workspace_id,item_key" }
    );
    if (error) return { error: "Couldn't add the item to this workspace." };
  } else {
    const { error } = await supabase
      .from("library_workspace_items")
      .delete()
      .eq("workspace_id", workspaceId.data)
      .eq("item_key", itemKey.data);
    if (error) return { error: "Couldn't remove the item from this workspace." };
  }

  revalidatePath("/my");
  return { ok: true };
}

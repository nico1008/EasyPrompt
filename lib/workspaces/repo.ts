import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type LibraryWorkspace = Database["public"]["Tables"]["library_workspaces"]["Row"];
export type LibraryWorkspaceItem = Database["public"]["Tables"]["library_workspace_items"]["Row"];

export type LibraryWorkspaceData = {
  workspaces: LibraryWorkspace[];
  memberships: LibraryWorkspaceItem[];
};

export async function listLibraryWorkspaceData(): Promise<LibraryWorkspaceData> {
  const supabase = await createClient();
  const [workspaceResult, membershipResult] = await Promise.all([
    supabase.from("library_workspaces").select("*").order("updated_at", { ascending: false }),
    supabase.from("library_workspace_items").select("*").order("created_at", { ascending: true }),
  ]);

  return {
    workspaces: workspaceResult.data ?? [],
    memberships: membershipResult.data ?? [],
  };
}

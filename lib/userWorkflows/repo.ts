import "server-only";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { readWorkflowDocument } from "./schema";

export type UserWorkflowRow = Database["public"]["Tables"]["user_workflows"]["Row"];

export async function listUserWorkflows(): Promise<UserWorkflowRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_workflows").select("*").order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getUserWorkflow(id: string): Promise<UserWorkflowRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_workflows").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function getCommunityWorkflow(slug: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("community_workflow", { p_slug: slug });
  if (error || !data?.length) return null;
  const row = data[0];
  return { ...row, document: readWorkflowDocument(row.document, row.document_version) };
}

export async function listCommunityWorkflows(limit = 24, offset = 0) {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("published_workflows", { p_limit: limit, p_offset: offset });
  return error ? [] : data ?? [];
}

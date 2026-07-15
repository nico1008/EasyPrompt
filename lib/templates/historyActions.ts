"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Json } from "@/lib/supabase/types";

export type TemplateHistoryItem = {
  id: string;
  reason: string;
  label: string | null;
  title: string;
  document: Json;
  created_at: string;
};

export async function listTemplateHistoryAction(templateId: string): Promise<TemplateHistoryItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("template_revisions")
    .select("id, reason, label, title, document, created_at")
    .eq("template_id", templateId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function snapshotTemplateVersionAction(templateId: string, label?: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Accounts aren't set up here." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };
  const { error } = await supabase.rpc("snapshot_template_version", {
    p_template_id: templateId,
    p_label: label?.trim().slice(0, 80) || null,
  });
  if (error) return { ok: false, error: "Couldn't save this version." };
  revalidatePath(`/my/templates/${templateId}`);
  return { ok: true };
}

export async function restoreTemplateVersionAction(
  templateId: string,
  revisionId: string
): Promise<{
  ok: boolean;
  error?: string;
  editVersion?: number;
  document?: Json;
  title?: string;
  outcome?: string;
  category?: string;
  icon?: string;
}> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Accounts aren't set up here." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };
  const { data: editVersion, error } = await supabase.rpc("restore_template_version", {
    p_template_id: templateId,
    p_revision_id: revisionId,
  });
  if (error) return { ok: false, error: "Couldn't restore this version." };
  const { data: row } = await supabase
    .from("user_templates")
    .select("document, title, blurb, category, icon")
    .eq("id", templateId)
    .maybeSingle();
  if (!row?.document) return { ok: false, error: "The restored version is unavailable." };
  revalidatePath("/my");
  revalidatePath(`/my/templates/${templateId}`);
  return { ok: true, editVersion, document: row.document, title: row.title, outcome: row.blurb ?? "", category: row.category, icon: row.icon };
}

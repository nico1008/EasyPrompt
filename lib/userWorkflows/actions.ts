"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getWorkflowByCatalogId, resolveWorkflowLinkedItem } from "@/data/workflows";
import { makeShareSlug } from "@/lib/notebooks/share";
import { getCommunityPrompt, getCommunityTemplate } from "@/lib/community/repo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { catalogWorkflowToDraft, readWorkflowDocument, validateWorkflowDraft, validateWorkflowForPublish, workflowDraftSaveError, type WorkflowDraft } from "./schema";
import { getCommunityWorkflow, getUserWorkflow } from "./repo";

export type WorkflowActionState = { ok?: boolean; id?: string; revision?: number; errors?: string[]; conflict?: boolean };

function parsePayload(formData: FormData): unknown {
  try { return JSON.parse(String(formData.get("payload") ?? "{}")); } catch { return null; }
}

async function userAndClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function rowFromDraft(ownerId: string, draft: WorkflowDraft) {
  return { owner_id: ownerId, title: draft.title, category: draft.category, blurb: draft.blurb,
    overview: draft.overview, time_label: draft.timeLabel, document: draft.document,
    document_version: draft.document.version, visibility: "private" as const };
}

export async function createWorkflowAction(_previous: WorkflowActionState, formData: FormData): Promise<WorkflowActionState> {
  if (!isSupabaseConfigured()) return { errors: ["Accounts aren't set up here."] };
  const parsed = validateWorkflowDraft(parsePayload(formData));
  if (!parsed.success) return { errors: parsed.error.issues.map((issue) => issue.message) };
  const saveError = workflowDraftSaveError(parsed.data);
  if (saveError) return { errors: [saveError] };
  const { supabase, user } = await userAndClient();
  if (!user) return { errors: ["Please log in again."] };
  const { data, error } = await supabase.from("user_workflows").insert(rowFromDraft(user.id, parsed.data)).select("id,revision").single();
  if (error || !data) return { errors: ["Couldn't create the Workflow."] };
  revalidatePath("/my");
  return { ok: true, id: data.id, revision: data.revision };
}

export async function updateWorkflowAction(_previous: WorkflowActionState, formData: FormData): Promise<WorkflowActionState> {
  if (!isSupabaseConfigured()) return { errors: ["Accounts aren't set up here."] };
  const id = String(formData.get("id") ?? "");
  const revision = Number(formData.get("revision"));
  const parsed = validateWorkflowDraft(parsePayload(formData));
  if (!id || !Number.isInteger(revision) || !parsed.success) return { errors: ["Invalid Workflow draft."] };
  const saveError = workflowDraftSaveError(parsed.data);
  if (saveError) return { errors: [saveError] };
  const { supabase, user } = await userAndClient();
  if (!user) return { errors: ["Please log in again."] };
  const draft = parsed.data;
  const { data, error } = await supabase.from("user_workflows").update({ title: draft.title, category: draft.category,
    blurb: draft.blurb, overview: draft.overview, time_label: draft.timeLabel, document: draft.document,
    document_version: draft.document.version, revision: revision + 1, updated_at: new Date().toISOString() })
    .eq("id", id).eq("revision", revision).select("revision").maybeSingle();
  if (error) return { errors: ["Couldn't save the Workflow."] };
  if (!data) return { conflict: true, errors: ["This Workflow changed in another editor. Reload before saving again."] };
  revalidatePath("/my"); revalidatePath(`/my/workflows/${id}`);
  return { ok: true, id, revision: data.revision };
}

async function linksArePublic(draft: WorkflowDraft): Promise<string[]> {
  const errors: string[] = [];
  for (const step of draft.document.steps) for (const link of step.linkedItems) {
    let valid = false;
    if (link.kind === "catalog_template") valid = !!resolveWorkflowLinkedItem({ type: "template", slug: link.key });
    if (link.kind === "catalog_prompt") valid = !!resolveWorkflowLinkedItem({ type: "prompt", slug: link.key });
    if (link.kind === "user_template") valid = !!(await getCommunityTemplate(link.key));
    if (link.kind === "user_prompt") valid = !!(await getCommunityPrompt(link.key));
    if (!valid) errors.push(`Step “${step.title || "Untitled"}” contains a link unavailable to public viewers.`);
  }
  return errors;
}

export async function setWorkflowPublishedAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const id = String(formData.get("id") ?? ""); const revision = Number(formData.get("revision"));
  const publish = formData.get("publish") === "true";
  const row = await getUserWorkflow(id); if (!row) return;
  const draft: WorkflowDraft = { title: row.title, category: row.category, blurb: row.blurb, overview: row.overview,
    timeLabel: row.time_label, document: readWorkflowDocument(row.document, row.document_version) };
  if (publish) {
    const errors = [...validateWorkflowForPublish(draft), ...(await linksArePublic(draft))];
    if (errors.length) redirect(`/my/workflows/${id}/edit?publishError=${encodeURIComponent(errors.join(" "))}`);
  }
  const { user } = await userAndClient(); if (!user) return;
  const privileged = createServiceRoleClient();
  await privileged.rpc("publish_workflow", { p_id: id, p_owner: user.id, p_revision: revision, p_share_slug: makeShareSlug(), p_publish: publish });
  revalidatePath("/my"); revalidatePath(`/my/workflows/${id}`); if (row.share_slug) revalidatePath(`/w/${row.share_slug}`);
}

export async function remixCatalogWorkflowAction(formData: FormData): Promise<void> {
  const catalogId = String(formData.get("catalogId") ?? "");
  const source = getWorkflowByCatalogId(catalogId); if (!source) redirect("/workflows");
  const { supabase, user } = await userAndClient(); if (!user) redirect(`/login?next=/workflows/${source.slug}`);
  const draft = catalogWorkflowToDraft(source);
  const { data } = await supabase.from("user_workflows").insert({ ...rowFromDraft(user.id, draft), source_kind: "catalog_workflow",
    source_catalog_id: source.catalogId, source_title_snapshot: source.title }).select("id").single();
  if (data) redirect(`/my/workflows/${data.id}/edit`);
}

export async function remixCommunityWorkflowAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? ""); const source = await getCommunityWorkflow(slug); if (!source) redirect("/workflows");
  const { supabase, user } = await userAndClient(); if (!user) redirect(`/login?next=/w/${slug}`);
  const draft: WorkflowDraft = { title: source.title, category: source.category, blurb: source.blurb, overview: source.overview,
    timeLabel: source.time_label, document: { ...source.document, steps: source.document.steps.map((s) => ({ ...s, id: crypto.randomUUID(), inlinePrompts: s.inlinePrompts.map((p) => ({...p,id:crypto.randomUUID()})) })) } };
  const { data } = await supabase.from("user_workflows").insert({ ...rowFromDraft(user.id, draft), source_kind: "user_workflow",
    source_workflow_id: source.id, source_title_snapshot: source.title, source_author_snapshot: source.author_username }).select("id").single();
  if (data) redirect(`/my/workflows/${data.id}/edit`);
}

export async function duplicateWorkflowAction(formData: FormData) {
  const id = String(formData.get("id") ?? ""); const source = await getUserWorkflow(id); if (!source) return;
  const { supabase, user } = await userAndClient(); if (!user) return;
  const document = readWorkflowDocument(source.document, source.document_version);
  await supabase.from("user_workflows").insert({ ...rowFromDraft(user.id, { title: `${source.title} (copy)`, category: source.category,
    blurb: source.blurb, overview: source.overview, timeLabel: source.time_label, document: { ...document,
      steps: document.steps.map((s) => ({...s,id:crypto.randomUUID(),inlinePrompts:s.inlinePrompts.map((p)=>({...p,id:crypto.randomUUID()}))})) } }),
    source_kind: source.source_kind, source_catalog_id: source.source_catalog_id, source_workflow_id: source.source_workflow_id,
    source_title_snapshot: source.source_title_snapshot, source_author_snapshot: source.source_author_snapshot });
  revalidatePath("/my");
}

export async function deleteWorkflowAction(formData: FormData) {
  const { supabase } = await userAndClient(); await supabase.from("user_workflows").delete().eq("id", String(formData.get("id") ?? "")); revalidatePath("/my");
}

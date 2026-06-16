import "server-only";

/* Version-history reads + the snapshot/prune helper. RLS scopes every query to
 * the owner (auth.uid() = owner_id), so no explicit owner filter is needed on
 * reads. recordVersion()/pruneVersions() are plain server utilities (not Server
 * Actions) shared by the version actions and the notebook update action. */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

export type VersionRow = Database["public"]["Tables"]["prompt_notebook_versions"]["Row"];

/** Lightweight version metadata for the History panel (doc kept for restore). */
export type NotebookVersion = {
  id: string;
  name: string;
  createdAt: string;
};

/** Keep at most this many snapshots per notebook (oldest pruned on write). */
export const MAX_VERSIONS = 20;

type DB = SupabaseClient<Database>;

export async function listVersions(notebookId: string): Promise<NotebookVersion[]> {
  const client = await createClient();
  const { data } = await client
    .from("prompt_notebook_versions")
    .select("id, name, created_at")
    .eq("notebook_id", notebookId)
    .order("created_at", { ascending: false })
    .limit(MAX_VERSIONS);
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
}

/** Fetch a single version's stored doc (RLS-scoped to the owner). */
export async function getVersionDoc(versionId: string): Promise<Json | null> {
  const client = await createClient();
  const { data } = await client
    .from("prompt_notebook_versions")
    .select("doc")
    .eq("id", versionId)
    .maybeSingle();
  return data?.doc ?? null;
}

/** Insert a snapshot, then prune to the newest MAX_VERSIONS for that notebook. */
export async function recordVersion(
  client: DB,
  v: { notebookId: string; ownerId: string; name: string; doc: Json }
): Promise<void> {
  await client.from("prompt_notebook_versions").insert({
    notebook_id: v.notebookId,
    owner_id: v.ownerId,
    name: v.name,
    doc: v.doc,
  });
  await pruneVersions(client, v.notebookId);
}

async function pruneVersions(client: DB, notebookId: string): Promise<void> {
  const { data } = await client
    .from("prompt_notebook_versions")
    .select("id")
    .eq("notebook_id", notebookId)
    .order("created_at", { ascending: false });
  const stale = (data ?? []).slice(MAX_VERSIONS).map((r) => r.id);
  if (stale.length) {
    await client.from("prompt_notebook_versions").delete().in("id", stale);
  }
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "../my.css";
import { Eyebrow } from "@/components/Eyebrow";
import { CrosshairCard } from "@/components/CrosshairCard";
import { ConfirmButton } from "@/components/ConfirmButton";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listNotebooks } from "@/lib/notebooks/repo";
import { rowToNotebook } from "@/lib/notebooks/map";
import { deleteNotebookAction, duplicateNotebookAction } from "@/lib/notebooks/actions";

export const metadata: Metadata = {
  title: "My notebooks",
  robots: { index: false, follow: false },
};

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function MyNotebooksPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const user = await getServerUser();
  if (!user) redirect("/login?next=/my/notebooks");

  const rows = await listNotebooks();
  const notebooks = rows.map((r) => ({ row: r, nb: rowToNotebook(r) }));

  return (
    <main className="my-page">
      <div className="my-wrap">
        <div className="my-head">
          <div>
            <Eyebrow>Your workspace</Eyebrow>
            <h1>My notebooks</h1>
          </div>
          <div className="my-head-actions">
            <Link className="btn btn-ghost btn-sm" href="/my">
              My prompts
            </Link>
            <Link className="btn btn-primary btn-sm" href="/build">
              + New notebook
            </Link>
          </div>
        </div>

        <section className="my-section">
          {notebooks.length === 0 ? (
            <CrosshairCard className="panel my-empty">
              <p>No notebooks yet. Compose a prompt block by block in the builder.</p>
              <Link className="btn btn-primary btn-sm" href="/build">
                Open the builder →
              </Link>
            </CrosshairCard>
          ) : (
            <div className="my-list">
              {notebooks.map(({ row, nb }) => (
                <CrosshairCard key={row.id} className="panel my-row">
                  <div className="my-row-main">
                    <span className="my-row-name">{row.name}</span>
                    <span className="my-row-sub">
                      {nb.doc.blocks.length} {nb.doc.blocks.length === 1 ? "block" : "blocks"} ·{" "}
                      {fmtDate(row.updated_at)}
                    </span>
                  </div>
                  <div className="my-row-actions">
                    <Link className="btn btn-primary btn-sm" href={`/my/notebooks/${row.id}`}>
                      Open
                    </Link>
                    <form action={duplicateNotebookAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <button type="submit" className="btn btn-ghost btn-sm">
                        Duplicate
                      </button>
                    </form>
                    <form action={deleteNotebookAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <ConfirmButton />
                    </form>
                  </div>
                </CrosshairCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

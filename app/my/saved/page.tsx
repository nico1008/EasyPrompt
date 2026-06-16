import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "../my.css";
import { Eyebrow } from "@/components/Eyebrow";
import { CrosshairCard } from "@/components/CrosshairCard";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MyTabs } from "@/components/MyTabs";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listUserTemplates } from "@/lib/userTemplates/repo";
import { listSavedPrompts } from "@/lib/savedPrompts/repo";
import {
  deleteSavedPromptAction,
  duplicateSavedPromptAction,
} from "@/lib/savedPrompts/actions";
import { getTemplate, displayTitle } from "@/data/templates";

export const metadata: Metadata = {
  title: "Saved prompts",
  robots: { index: false, follow: false },
};

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function MySavedPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const user = await getServerUser();
  if (!user) redirect("/login?next=/my/saved");

  const [templates, prompts] = await Promise.all([listUserTemplates(), listSavedPrompts()]);
  const titleById = new Map(templates.map((t) => [t.id, t.title]));

  function sourceLabel(p: (typeof prompts)[number]): string {
    if (p.source_kind === "catalog" && p.catalog_slug) {
      const t = getTemplate(p.catalog_slug);
      return t ? displayTitle(t) : p.catalog_slug;
    }
    if (p.source_kind === "user" && p.user_template_id) {
      return titleById.get(p.user_template_id) ?? "Custom template";
    }
    return "Template";
  }

  return (
    <main className="my-page">
      <div className="my-wrap">
        <div className="my-head">
          <div>
            <Eyebrow>Your workspace</Eyebrow>
            <h1>My prompts</h1>
          </div>
          <div className="my-head-actions">
            <Link className="btn btn-primary btn-sm" href="/prompts">
              Browse catalog
            </Link>
          </div>
        </div>

        <MyTabs />

        <section className="my-section">
          {prompts.length === 0 ? (
            <CrosshairCard className="panel my-empty">
              <p>No saved prompts yet. Fill in any template and hit “Save”.</p>
              <Link className="btn btn-ghost btn-sm" href="/prompts">
                Browse templates →
              </Link>
            </CrosshairCard>
          ) : (
            <div className="my-list">
              {prompts.map((p) => (
                <CrosshairCard key={p.id} className="panel my-row">
                  <div className="my-row-main">
                    <span className="my-row-name">{p.name}</span>
                    <span className="my-row-sub">
                      from {sourceLabel(p)} · {fmtDate(p.updated_at)}
                    </span>
                  </div>
                  <div className="my-row-actions">
                    <Link className="btn btn-primary btn-sm" href={`/my/prompts/${p.id}`}>
                      Open
                    </Link>
                    <form action={duplicateSavedPromptAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="btn btn-ghost btn-sm">
                        Duplicate
                      </button>
                    </form>
                    <form action={deleteSavedPromptAction}>
                      <input type="hidden" name="id" value={p.id} />
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

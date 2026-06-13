import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "./my.css";
import { Eyebrow } from "@/components/Eyebrow";
import { CrosshairCard } from "@/components/CrosshairCard";
import { Icon } from "@/components/Icon";
import { ConfirmButton } from "@/components/ConfirmButton";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listUserTemplates } from "@/lib/userTemplates/repo";
import { listSavedPrompts } from "@/lib/savedPrompts/repo";
import {
  deleteUserTemplateAction,
  duplicateUserTemplateAction,
} from "@/lib/userTemplates/actions";
import {
  deleteSavedPromptAction,
  duplicateSavedPromptAction,
} from "@/lib/savedPrompts/actions";
import { getTemplate, displayTitle, categoryLabel } from "@/data/templates";
import type { IconName } from "@/components/iconNames";

export const metadata: Metadata = {
  title: "My prompts",
  robots: { index: false, follow: false },
};

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function MyDashboardPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const user = await getServerUser();
  if (!user) redirect("/login?next=/my");

  const [templates, prompts] = await Promise.all([
    listUserTemplates(),
    listSavedPrompts(),
  ]);
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
            <Link className="btn btn-ghost btn-sm" href="/prompts">
              Browse catalog
            </Link>
            <Link className="btn btn-primary btn-sm" href="/my/templates/new">
              + New template
            </Link>
          </div>
        </div>

        {/* ---------------- My templates ---------------- */}
        <section className="my-section">
          <h2>My templates</h2>
          {templates.length === 0 ? (
            <CrosshairCard className="panel my-empty">
              <p>You haven&apos;t built any templates yet.</p>
              <Link className="btn btn-primary btn-sm" href="/my/templates/new">
                Create your first template →
              </Link>
            </CrosshairCard>
          ) : (
            <div className="my-grid">
              {templates.map((t) => (
                <CrosshairCard key={t.id} className="panel my-card">
                  <div className="my-card-icon">
                    <Icon name={(t.icon as IconName) ?? "star"} size={20} />
                  </div>
                  <h3>{t.title}</h3>
                  <p className="my-card-sub">
                    {categoryLabel(t.category)} ·{" "}
                    {Array.isArray(t.fields) ? t.fields.length : 0} questions
                  </p>
                  <div className="my-card-actions">
                    <Link className="btn btn-primary btn-sm" href={`/my/templates/${t.id}`}>
                      Use
                    </Link>
                    <Link className="btn btn-ghost btn-sm" href={`/my/templates/${t.id}/edit`}>
                      Edit
                    </Link>
                    <form action={duplicateUserTemplateAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className="btn btn-ghost btn-sm">
                        Duplicate
                      </button>
                    </form>
                    <form action={deleteUserTemplateAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <ConfirmButton />
                    </form>
                  </div>
                </CrosshairCard>
              ))}
            </div>
          )}
        </section>

        {/* ---------------- Saved prompts ---------------- */}
        <section className="my-section">
          <h2>Saved prompts</h2>
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

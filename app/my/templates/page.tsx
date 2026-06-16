import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "../my.css";
import { Eyebrow } from "@/components/Eyebrow";
import { CrosshairCard } from "@/components/CrosshairCard";
import { Icon } from "@/components/Icon";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MyTabs } from "@/components/MyTabs";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listUserTemplates } from "@/lib/userTemplates/repo";
import {
  deleteUserTemplateAction,
  duplicateUserTemplateAction,
} from "@/lib/userTemplates/actions";
import { categoryLabel } from "@/data/templates";
import type { IconName } from "@/components/iconNames";

export const metadata: Metadata = {
  title: "My templates",
  robots: { index: false, follow: false },
};

export default async function MyTemplatesPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const user = await getServerUser();
  if (!user) redirect("/login?next=/my/templates");

  const templates = await listUserTemplates();

  return (
    <main className="my-page">
      <div className="my-wrap">
        <div className="my-head">
          <div>
            <Eyebrow>Your workspace</Eyebrow>
            <h1>My prompts</h1>
          </div>
          <div className="my-head-actions">
            <Link className="btn btn-primary btn-sm" href="/my/templates/new">
              + New template
            </Link>
          </div>
        </div>

        <MyTabs />

        <section className="my-section">
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
      </div>
    </main>
  );
}

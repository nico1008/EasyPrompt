import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "./my.css";
import { Eyebrow } from "@/components/Eyebrow";
import { CrosshairCard } from "@/components/CrosshairCard";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MyTabs } from "@/components/MyTabs";
import { Icon } from "@/components/Icon";
import { LibraryControls } from "@/components/library/LibraryControls";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listNotebooks } from "@/lib/notebooks/repo";
import { listUserTemplates } from "@/lib/userTemplates/repo";
import { listSavedPrompts } from "@/lib/savedPrompts/repo";
import { listBookmarks } from "@/lib/bookmarks/repo";
import { rowToBookmark } from "@/lib/bookmarks/map";
import {
  buildLibrary,
  filterLibrary,
  isLibraryFilter,
  type LibraryFilter,
  type LibraryInternal,
} from "@/lib/library/list";
import { deleteNotebookAction, duplicateNotebookAction } from "@/lib/notebooks/actions";
import { deleteUserTemplateAction, duplicateUserTemplateAction } from "@/lib/userTemplates/actions";
import { deleteSavedPromptAction, duplicateSavedPromptAction } from "@/lib/savedPrompts/actions";
import { removeBookmarkAction } from "@/lib/bookmarks/actions";
import { categoryLabel, questionCount, displayTitle } from "@/data/templates";

export const metadata: Metadata = {
  title: "My Library",
  robots: { index: false, follow: false },
};

type FormAction = (formData: FormData) => void | Promise<void>;
const DUP: Record<LibraryInternal, FormAction> = {
  notebook: duplicateNotebookAction,
  user_template: duplicateUserTemplateAction,
  saved_prompt: duplicateSavedPromptAction,
};
const DEL: Record<LibraryInternal, FormAction> = {
  notebook: deleteNotebookAction,
  user_template: deleteUserTemplateAction,
  saved_prompt: deleteSavedPromptAction,
};

export default async function MyLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/");
  const user = await getServerUser();
  if (!user) redirect("/login?next=/my");

  const { filter: raw } = await searchParams;
  const filter: LibraryFilter = isLibraryFilter(raw) ? raw : "all";

  return (
    <main className="my-page">
      <div className="my-wrap">
        <div className="my-head">
          <div>
            <Eyebrow>Your workspace</Eyebrow>
            <h1>My Library</h1>
          </div>
          <div className="my-head-actions">
            <Link className="btn btn-primary btn-sm" href="/build">
              + New template
            </Link>
            <Link className="btn btn-ghost btn-sm" href="/my/templates/new">
              Form editor
            </Link>
          </div>
        </div>

        <MyTabs />

        <section className="my-section" style={{ marginTop: 24 }}>
          {filter === "favorites" ? <Favorites /> : <OwnedList filter={filter} />}
        </section>
      </div>
    </main>
  );
}

async function OwnedList({ filter }: { filter: LibraryFilter }) {
  const [notebooks, userTemplates, prompts] = await Promise.all([
    listNotebooks(),
    listUserTemplates(),
    listSavedPrompts(),
  ]);
  const items = filterLibrary(buildLibrary({ notebooks, userTemplates, prompts }), filter);

  if (items.length === 0) {
    return (
      <CrosshairCard className="panel my-empty">
        <p>Nothing here yet. Build a template, or fill one in to generate a prompt.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn btn-primary btn-sm" href="/build">
            Build a template →
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/templates">
            Browse templates
          </Link>
        </div>
      </CrosshairCard>
    );
  }

  return (
    <div className="my-list">
      {items.map((it) => (
        <CrosshairCard key={it.key} className="panel my-row">
          <div className="my-row-main">
            <span className="my-row-name">
              <span className={`my-type my-type-${it.objectType}`}>
                {it.objectType === "template" ? "Template" : "Prompt"}
              </span>
              {it.title}
              {it.shared && <span className="my-badge">Shared</span>}
            </span>
            <span className="my-row-sub">
              {it.meta}
              {it.source && (
                <>
                  {" · "}
                  Created from <Link href={it.source.href}>{it.source.label}</Link>
                </>
              )}
            </span>
          </div>
          <div className="my-row-actions">
            <Link className="btn btn-primary btn-sm" href={it.primaryHref}>
              {it.primaryLabel}
            </Link>
            {it.editHref && (
              <Link className="btn btn-ghost btn-sm" href={it.editHref}>
                Edit
              </Link>
            )}
            <LibraryControls
              internal={it.internal}
              id={it.id}
              status={it.status}
              shareSlug={it.shareSlug}
            />
            <form action={DUP[it.internal]}>
              <input type="hidden" name="id" value={it.id} />
              <button type="submit" className="btn btn-ghost btn-sm">
                Duplicate
              </button>
            </form>
            <form action={DEL[it.internal]}>
              <input type="hidden" name="id" value={it.id} />
              <ConfirmButton />
            </form>
          </div>
        </CrosshairCard>
      ))}
    </div>
  );
}

async function Favorites() {
  const items = (await listBookmarks()).map((row) => rowToBookmark(row)).filter((b) => b.template !== null);
  if (items.length === 0) {
    return (
      <CrosshairCard className="panel my-empty">
        <p>No favorites yet. Tap the bookmark on any template to keep it here.</p>
        <Link className="btn btn-primary btn-sm" href="/templates">
          Browse templates →
        </Link>
      </CrosshairCard>
    );
  }
  return (
    <div className="my-grid">
      {items.map((b) => {
        const t = b.template!;
        return (
          <CrosshairCard key={b.id} className="panel my-card">
            <div className="my-card-icon">
              <Icon name={t.icon} size={20} />
            </div>
            <h3>{displayTitle(t)}</h3>
            <p className="my-card-sub">
              {categoryLabel(t.category)} · {questionCount(t)} questions
            </p>
            <div className="my-card-actions">
              <Link className="btn btn-primary btn-sm" href={`/templates/${t.slug}`}>
                Use
              </Link>
              <Link className="btn btn-ghost btn-sm" href={`/build?from=${t.slug}`}>
                Customize
              </Link>
              <form action={removeBookmarkAction}>
                <input type="hidden" name="id" value={b.id} />
                <ConfirmButton label="Remove" confirmLabel="Confirm remove" />
              </form>
            </div>
          </CrosshairCard>
        );
      })}
    </div>
  );
}

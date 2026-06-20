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
import { objectMeta } from "@/lib/library/objectMeta";
import { deleteNotebookAction, duplicateNotebookAction } from "@/lib/notebooks/actions";
import { deleteUserTemplateAction, duplicateUserTemplateAction } from "@/lib/userTemplates/actions";
import { deleteSavedPromptAction, duplicateSavedPromptAction } from "@/lib/savedPrompts/actions";
import { removeBookmarkAction } from "@/lib/bookmarks/actions";
import { categoryLabel, questionCount, displayTitle } from "@/data/templates";

export const metadata: Metadata = {
  title: "My Library",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  unlisted: "Unlisted",
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
              <Icon name="plus" size={14} /> New
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

  if (items.length === 0) return <EmptyState filter={filter} />;

  return (
    <div className="my-list">
      {items.map((it) => (
        <CrosshairCard key={it.key} className="panel my-row">
          <div className="my-row-main">
            <span className="my-row-name">
              <span className={`my-type my-type-${it.objectType}`}>
                <Icon name={objectMeta(it.objectType).icon} size={11} />
                {objectMeta(it.objectType).label}
              </span>
              {it.title}
              <span className={`my-status my-status-${it.status}`}>{STATUS_LABEL[it.status]}</span>
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

/* Actionable, filter-aware empty states — never a bare panel. */
function EmptyState({ filter }: { filter: LibraryFilter }) {
  if (filter === "templates") {
    return (
      <CrosshairCard className="panel my-empty">
        <span className="my-empty-ic my-empty-ic-template">
          <Icon name="list" size={22} />
        </span>
        <h3>No templates yet</h3>
        <p>Templates are reusable frameworks you fill in to generate a prompt.</p>
        <div className="my-empty-actions">
          <Link className="btn btn-primary btn-sm" href="/build/template">
            + New Template
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/templates">
            Browse templates
          </Link>
        </div>
      </CrosshairCard>
    );
  }
  if (filter === "prompts") {
    return (
      <CrosshairCard className="panel my-empty">
        <span className="my-empty-ic my-empty-ic-prompt">
          <Icon name="code" size={22} />
        </span>
        <h3>No prompts yet</h3>
        <p>Prompts are ready-to-use text you can copy straight into an AI.</p>
        <div className="my-empty-actions">
          <Link className="btn btn-primary btn-sm" href="/build/prompt">
            + New Prompt
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/prompts">
            Browse prompts
          </Link>
        </div>
      </CrosshairCard>
    );
  }
  if (filter === "drafts" || filter === "published" || filter === "shared") {
    const copy = {
      drafts: "Work you haven’t published yet will collect here.",
      published: "Publish a template or prompt to share it publicly — it’ll appear here.",
      shared: "Share a template or prompt to mint a link; shared items show up here.",
    }[filter];
    return (
      <CrosshairCard className="panel my-empty">
        <span className="my-empty-ic">
          <Icon name="note" size={22} />
        </span>
        <h3>Nothing here yet</h3>
        <p>{copy}</p>
        <div className="my-empty-actions">
          <Link className="btn btn-primary btn-sm" href="/build">
            <Icon name="plus" size={14} /> New
          </Link>
        </div>
      </CrosshairCard>
    );
  }
  // all
  return (
    <CrosshairCard className="panel my-empty">
      <span className="my-empty-ic">
        <Icon name="star" size={22} />
      </span>
      <h3>Your library is empty</h3>
      <p>Create your first template or prompt — everything you make lives here.</p>
      <div className="my-empty-actions">
        <Link className="btn btn-primary btn-sm" href="/build/template">
          + New Template
        </Link>
        <Link className="btn btn-ink btn-sm" href="/build/prompt">
          + New Prompt
        </Link>
      </div>
    </CrosshairCard>
  );
}

async function Favorites() {
  // Bookmarks point at catalog Templates or curated example Prompts; drop any
  // whose target was since removed.
  const items = (await listBookmarks())
    .map((row) => rowToBookmark(row))
    .filter((b) => b.template !== null || b.prompt !== null);

  if (items.length === 0) {
    return (
      <CrosshairCard className="panel my-empty">
        <p>No favorites yet. Tap the bookmark on any template or prompt to keep it here.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn btn-primary btn-sm" href="/templates">
            Browse templates →
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/prompts">
            Browse prompts
          </Link>
        </div>
      </CrosshairCard>
    );
  }

  return (
    <div className="my-grid">
      {items.map((b) =>
        b.template ? (
          <CrosshairCard key={b.id} className="panel my-card">
            <div className="my-card-icon">
              <Icon name={b.template.icon} size={20} />
            </div>
            <span className="my-type my-type-template">
              <Icon name="list" size={11} /> Template
            </span>
            <h3>{displayTitle(b.template)}</h3>
            <p className="my-card-sub">
              {categoryLabel(b.template.category)} · {questionCount(b.template)} questions
            </p>
            <div className="my-card-actions">
              <Link className="btn btn-primary btn-sm" href={`/templates/${b.template.slug}`}>
                Use
              </Link>
              <Link className="btn btn-ghost btn-sm" href={`/build/template?from=${b.template.slug}`}>
                Customize
              </Link>
              <form action={removeBookmarkAction}>
                <input type="hidden" name="id" value={b.id} />
                <ConfirmButton label="Remove" confirmLabel="Confirm remove" />
              </form>
            </div>
          </CrosshairCard>
        ) : (
          <CrosshairCard key={b.id} className="panel my-card">
            <div className="my-card-icon">
              <Icon name={b.prompt!.icon} size={20} />
            </div>
            <span className="my-type my-type-prompt">
              <Icon name="code" size={11} /> Prompt
            </span>
            <h3>{b.prompt!.title}</h3>
            <p className="my-card-sub">{categoryLabel(b.prompt!.category)} · ready to use</p>
            <div className="my-card-actions">
              <Link className="btn btn-primary btn-sm" href={`/prompts/${b.prompt!.slug}`}>
                Open
              </Link>
              <form action={removeBookmarkAction}>
                <input type="hidden" name="id" value={b.id} />
                <ConfirmButton label="Remove" confirmLabel="Confirm remove" />
              </form>
            </div>
          </CrosshairCard>
        )
      )}
    </div>
  );
}

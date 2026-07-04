import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "./my.css";
import { Eyebrow } from "@/components/Eyebrow";
import { CrosshairCard } from "@/components/CrosshairCard";
import { MyTabs } from "@/components/MyTabs";
import { Icon } from "@/components/Icon";
import { BookmarkButton } from "@/components/BookmarkButton";
import { MyLibraryGrid } from "@/components/library/MyLibraryGrid";
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
} from "@/lib/library/list";
import { categoryLabel, questionCount, displayTitle } from "@/data/templates";

export const metadata: Metadata = {
  title: "My Library",
  robots: { index: false, follow: false },
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

  return <MyLibraryGrid items={items} />;
}

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
  return (
    <CrosshairCard className="panel my-empty">
      <span className="my-empty-ic">
        <Icon name="star" size={22} />
      </span>
      <h3>Your library is empty</h3>
      <p>Create your first template or prompt. Everything you make lives here.</p>
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
  const items = (await listBookmarks())
    .map((row) => rowToBookmark(row))
    .filter((b) => b.template !== null || b.prompt !== null);

  if (items.length === 0) {
    return (
      <CrosshairCard className="panel my-empty">
        <p>No favorites yet. Tap the bookmark on any template or prompt to keep it here.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn btn-primary btn-sm" href="/templates">
            Browse templates
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
          <article key={b.id} className="my-card-tile is-template">
            <div className="mct-bar">
              <span className="mct-glyph" aria-hidden="true">
                <Icon name="list" size={14} />
              </span>
              <h3 className="mct-title">
                <Link className="mct-link" href={`/templates/${b.template.slug}`}>
                  {displayTitle(b.template)}
                </Link>
              </h3>
              <span className="mct-fav">
                <BookmarkButton compact target={{ kind: "catalog", key: b.template.slug }} />
              </span>
            </div>
            <div className="mct-body">
              <p className="mct-blurb">{b.template.blurb}</p>
            </div>
            <div className="mct-foot">
              <span className="mct-meta">
                {categoryLabel(b.template.category)} - {questionCount(b.template)} questions
              </span>
            </div>
          </article>
        ) : (
          <article key={b.id} className="my-card-tile is-prompt">
            <div className="mct-bar">
              <span className="mct-glyph" aria-hidden="true">
                <Icon name="code" size={14} />
              </span>
              <h3 className="mct-title">
                <Link className="mct-link" href={`/prompts/${b.prompt!.slug}`}>
                  {b.prompt!.title}
                </Link>
              </h3>
              <span className="mct-fav">
                <BookmarkButton compact target={{ kind: "example_prompt", key: b.prompt!.slug }} />
              </span>
            </div>
            <div className="mct-body">
              <p className="mct-blurb">{b.prompt!.blurb}</p>
            </div>
            <div className="mct-foot">
              <span className="mct-meta">{categoryLabel(b.prompt!.category)} - ready to use</span>
            </div>
          </article>
        )
      )}
    </div>
  );
}

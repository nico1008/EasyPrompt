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
import { listBookmarks } from "@/lib/bookmarks/repo";
import { rowToBookmark } from "@/lib/bookmarks/map";
import { removeBookmarkAction } from "@/lib/bookmarks/actions";
import { categoryLabel, questionCount, displayTitle } from "@/data/templates";

export const metadata: Metadata = {
  title: "My library",
  robots: { index: false, follow: false },
};

export default async function MyLibraryPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const user = await getServerUser();
  if (!user) redirect("/login?next=/my/library");

  // Resolve rows to catalog templates; drop any whose slug no longer exists.
  const items = (await listBookmarks())
    .map((row) => rowToBookmark(row))
    .filter((b) => b.template !== null);

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
          {items.length === 0 ? (
            <CrosshairCard className="panel my-empty">
              <p>No saved templates yet. Tap the bookmark on any template to keep it here.</p>
              <Link className="btn btn-primary btn-sm" href="/prompts">
                Browse templates →
              </Link>
            </CrosshairCard>
          ) : (
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
                      <Link className="btn btn-primary btn-sm" href={`/prompts/${t.slug}`}>
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
          )}
        </section>
      </div>
    </main>
  );
}

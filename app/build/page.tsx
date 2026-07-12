import type { Metadata } from "next";
import Link from "next/link";
import "./overview.css";
import { Eyebrow } from "@/components/Eyebrow";
import { CrosshairCard } from "@/components/CrosshairCard";
import { Icon } from "@/components/Icon";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getServerUser } from "@/lib/supabase/server";
import { listNotebooks } from "@/lib/notebooks/repo";
import { listUserTemplates } from "@/lib/userTemplates/repo";
import { listSavedPrompts } from "@/lib/savedPrompts/repo";
import { listUserWorkflows } from "@/lib/userWorkflows/repo";
import { buildLibrary } from "@/lib/library/list";
import { objectMeta } from "@/lib/library/objectMeta";

/* The Builder overview — a calm "what do you want to make?" hub that replaces the
 * old straight-to-blank-canvas. Anon-safe: the two create CTAs always show and
 * both editors work without an account. Signed in, it also surfaces recent
 * creations with an Edit shortcut. (The block builder lives at /build/template;
 * the markdown editor at /build/prompt.) */

export const metadata: Metadata = {
  title: "Builder — create a template or a prompt",
  description:
    "Start something new: build a reusable prompt template block by block, or write a ready-to-use prompt in the markdown editor.",
};

const CHOICES = [
  {
    href: "/build/template",
    tone: "template" as const,
    icon: "list" as const,
    title: "New Template",
    sub: "Reusable framework",
    blurb:
      "Compose a template block by block — role, objective, inputs. Fill it in any time to generate a polished prompt.",
  },
  {
    href: "/build/prompt",
    tone: "prompt" as const,
    icon: "code" as const,
    title: "New Prompt",
    sub: "Ready-to-use text",
    blurb: "Write a finished prompt in a live markdown editor, then copy it or save it to your library.",
  },
  { href: "/build/workflow", tone: "workflow" as const, icon: "book" as const, title: "New Workflow", sub: "Guided multi-step playbook", blurb: "Sequence Templates, Prompts, and inline prompt text into a practical playbook." },
];

export default async function BuildOverviewPage() {
  const accountsOn = isSupabaseConfigured();
  const user = accountsOn ? await getServerUser() : null;

  return (
    <main className="build-overview">
      <div className="bo-wrap">
        <div className="bo-head">
          <Eyebrow>Create</Eyebrow>
          <h1>What do you want to make?</h1>
          <p>
            A <strong>Template</strong> is a reusable framework you fill in. A <strong>Prompt</strong>{" "}
            is finished text you paste straight into an AI. Start with either.
          </p>
        </div>

        <div className="bo-choices">
          {CHOICES.map((c) => (
            <Link key={c.href} href={c.href} className={`bo-choice bo-choice-${c.tone}`}>
              <div className="bo-choice-head">
                <span className="bo-choice-ic">
                  <Icon name={c.icon} size={20} />
                </span>
                <span className="bo-choice-heading">
                  <span className="bo-choice-title">{c.title}</span>
                  <span className="bo-choice-sub">{c.sub}</span>
                </span>
              </div>
              <p className="bo-choice-blurb">{c.blurb}</p>
              <span className="bo-choice-go">
                Start <Icon name="arrow-right" size={14} />
              </span>
            </Link>
          ))}
        </div>

        {user ? (
          <RecentCreations />
        ) : accountsOn ? (
          <CrosshairCard className="panel bo-signin">
            <p>
              <Link href="/login?next=/build">Log in</Link> to keep your work, see everything you’ve
              made, and pick up where you left off.
            </p>
          </CrosshairCard>
        ) : null}
      </div>
    </main>
  );
}

async function RecentCreations() {
  const [notebooks, userTemplates, prompts, workflows] = await Promise.all([
    listNotebooks(),
    listUserTemplates(),
    listSavedPrompts(),
    listUserWorkflows(),
  ]);
  const items = buildLibrary({ notebooks, userTemplates, prompts, workflows }).slice(0, 6);

  if (items.length === 0) {
    return (
      <div className="bo-recent">
        <div className="bo-recent-head">
          <h2>Your recent work</h2>
        </div>
        <CrosshairCard className="panel bo-empty">
          <span className="bo-empty-ic">
            <Icon name="star" size={20} />
          </span>
          <div>
            <strong>Nothing here yet.</strong>
            <p>Your Templates and Prompts will collect here — make your first one above ↑</p>
          </div>
        </CrosshairCard>
      </div>
    );
  }

  return (
    <div className="bo-recent">
      <div className="bo-recent-head">
        <h2>Your recent work</h2>
        <Link className="bo-viewall" href="/my">
          View all in My Library →
        </Link>
      </div>
      <div className="bo-recent-list">
        {items.map((it) => (
          <div key={it.key} className="bo-recent-row panel">
            <span className="bo-recent-name">
              <span className={`bo-type bo-type-${it.objectType}`}>
                <Icon name={objectMeta(it.objectType).icon} size={11} />
                {objectMeta(it.objectType).label}
              </span>
              {it.title}
            </span>
            <span className="bo-recent-meta">{it.meta}</span>
            <Link className="btn btn-ghost btn-sm" href={it.editHref ?? it.primaryHref}>
              Edit
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import "./landing.css";
import { CrosshairCard } from "@/components/CrosshairCard";
import { Icon } from "@/components/Icon";
import { config } from "@/config";

const CHIPS: { label: string; slug?: string }[] = [
  { label: "Weekly meal planner", slug: "weekly-meal-planner" },
  { label: "Cover letter", slug: "tailored-cover-letter" },
  { label: "Lesson plan", slug: "k12-lesson-plan" },
  { label: "Customer email reply", slug: "customer-email-reply" },
  { label: "React component scaffold", slug: "react-component-scaffold" },
  { label: "Performance review", slug: "performance-review" },
];

function chipHref(c: { label: string; slug?: string }) {
  return c.slug ? `/templates/${c.slug}` : `/templates?q=${encodeURIComponent(c.label)}`;
}

export default function LandingPage() {
  return (
    <main className="landing">
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-inner">
          <div className="hero-kicker">
            <span className="dot" />
            your prompt workspace
          </div>
          <h1 className="display">Browse AI prompts you can use again.</h1>
          <p className="sub">
            Find reusable <strong>Templates</strong> for repeat work and ready{" "}
            <strong>Prompts</strong> you can copy now. Build your own when the catalog
            does not fit.
          </p>

          <div className="ctas" aria-label="Primary actions">
            <Link className="btn btn-primary btn-lg" href="/templates">
              Browse templates
            </Link>
            <Link className="btn btn-ink btn-lg" href="/prompts">
              Browse prompts
            </Link>
          </div>
          <Link className="hero-build-link" href="/build">
            Build your own <Icon name="arrow-right" size={14} />
          </Link>

          <CrosshairCard
            className="catalog-preview"
            aria-label="Browse reusable Templates and ready-to-copy Prompts."
          >
            <Link
              className="landing-tile landing-template-tile"
              href="/templates"
              aria-label="Browse reusable Templates"
            >
              <div className="lp-tile-bar">
                <span className="lp-glyph" aria-hidden="true">
                  <Icon name="list" size={14} />
                </span>
                <h2>Launch email framework</h2>
                <span className="lp-star" aria-hidden="true">
                  <Icon name="star" size={12} />
                </span>
              </div>
              <div className="lp-tile-body">
                <p>
                  Plan a reusable campaign sequence with fields for goal, audience,
                  offer, and constraints.
                </p>
              </div>
              <div className="lp-tile-foot">
                <span>Marketing</span>
                <span className="lp-meta">
                  <span>1.2k uses</span>
                  <span>4 questions</span>
                </span>
              </div>
            </Link>

            <Link
              className="landing-tile landing-prompt-tile"
              href="/prompts"
              aria-label="Browse ready-to-copy Prompts"
            >
              <div className="lp-tile-bar">
                <span className="lp-glyph" aria-hidden="true">
                  <Icon name="code" size={14} />
                </span>
                <h2>product-critique.prompt.md</h2>
              </div>
              <div className="lp-tile-body">
                <p>
                  A finished markdown prompt for finding UX risks, sharper positioning,
                  and practical next steps.
                </p>
              </div>
              <div className="lp-tile-foot">
                <span className="lp-meta">
                  <span>Work</span>
                  <span>842 uses</span>
                </span>
                <span className="lp-copy">
                  <Icon name="copy" size={13} />
                  Copy
                </span>
              </div>
            </Link>
          </CrosshairCard>
        </div>
      </section>

      <section className="browse-section">
        <div className="section-copy">
          <h2 className="h2">Start from a real task.</h2>
          <p>
            Search the catalogs first. Templates help when the work repeats. Prompts help
            when the instruction is already ready to copy.
          </p>
        </div>
        <div className="chips" aria-label="Popular starting points">
          {CHIPS.map((c) => (
            <Link key={c.label} className="chip" href={chipHref(c)}>
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="build-section">
        <div className="build-copy">
          <h2 className="h2">Build your own when nothing fits.</h2>
          <p>
            Create a reusable Template for work you repeat, or write a new Prompt when you
            already know the exact instruction.
          </p>
        </div>
        <div className="build-actions" aria-label="Build actions">
          <Link className="build-action build-action-template" href="/build/template">
            <span>
              <Icon name="list" size={18} />
            </span>
            <div>
              <strong>New Template</strong>
              <small>For repeat work</small>
            </div>
            <Icon name="arrow-right" size={15} />
          </Link>
          <Link className="build-action build-action-prompt" href="/build/prompt">
            <span>
              <Icon name="code" size={18} />
            </span>
            <div>
              <strong>New Prompt</strong>
              <small>For ready markdown</small>
            </div>
            <Icon name="arrow-right" size={15} />
          </Link>
        </div>
      </section>

      <section className="workflow">
        <div className="section-copy">
          <h2 className="h2">Browse, copy, save.</h2>
          <p>
            EasyPrompt stays close to the way people already work with ChatGPT, Claude,
            Gemini, and Codex.
          </p>
        </div>
        <div className="workflow-list">
          <div className="workflow-row">
            <span className="num">1</span>
            <div>
              <h3>Choose a starting point</h3>
              <p>Use a catalog Template or Prompt that already matches the job.</p>
            </div>
          </div>
          <div className="workflow-row">
            <span className="num">2</span>
            <div>
              <h3>Copy to any AI</h3>
              <p>Take the finished text into the tool you already use.</p>
            </div>
          </div>
          <div className="workflow-row">
            <span className="num">3</span>
            <div>
              <h3>Save and share your best work</h3>
              <p>Keep it private, send an unlisted link, or publish when ready.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="support-section">
        <div className="support-copy">
          <h2 className="h2">Save and share your best work.</h2>
          <p>
            Keep reusable Templates and ready Prompts in one library. Share private
            links, publish useful work, or come back to the prompts you use often.
          </p>
          <div className="support-actions">
            <Link className="btn btn-ghost btn-sm" href="/my">
              Open My Library
            </Link>
            <Link className="btn btn-ghost btn-sm" href="/submit-template">
              Submit a template
            </Link>
          </div>
        </div>
        <div className="support-panel" aria-label="Library, sharing, and publishing">
          <div className="support-row">
            <span className="support-icon support-icon-template" aria-hidden="true">
              <Icon name="list" size={16} />
            </span>
            <div>
              <strong>Library</strong>
              <span>Keep Templates and Prompts together</span>
            </div>
          </div>
          <div className="support-row">
            <span className="support-icon support-icon-prompt" aria-hidden="true">
              <Icon name="share" size={16} />
            </span>
            <div>
              <strong>Share</strong>
              <span>Send an unlisted link when ready</span>
            </div>
          </div>
          <div className="support-row">
            <span className="support-icon" aria-hidden="true">
              <Icon name="megaphone" size={16} />
            </span>
            <div>
              <strong>Publish</strong>
              <span>Make useful work discoverable</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing-teaser">
        <div className="pt-copy">
          <h2 className="h2">Core browsing is free.</h2>
          <p>
            Browse, copy, create, and save prompts for free. Pro Boosters add sharper
            building blocks for {config.pricing.lifetime}.
          </p>
        </div>
        <Link className="btn btn-ghost" href="/pricing">
          See pricing
        </Link>
      </section>

      <section className="closing">
        <div className="closing-copy">
          <h2 className="h2">Find the prompt that gets you moving.</h2>
          <p>
            Start from the catalog, then copy, save, or build only when you need
            something more specific.
          </p>
        </div>
        <div className="closing-panel">
          <div className="closing-rows" aria-hidden="true">
            <span>
              <Icon name="list" size={16} /> Templates for repeat work
            </span>
            <span>
              <Icon name="code" size={16} /> Prompts ready to copy
            </span>
          </div>
          <div className="closing-actions">
            <Link className="btn btn-primary btn-lg" href="/templates">
              Browse templates
            </Link>
            <Link className="btn btn-ink btn-lg" href="/prompts">
              Browse prompts
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

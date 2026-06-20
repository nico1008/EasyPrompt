import Link from "next/link";
import "./landing.css";
import { Eyebrow } from "@/components/Eyebrow";
import { CrosshairCard } from "@/components/CrosshairCard";
import { Icon } from "@/components/Icon";
import { TEMPLATES, CATEGORIES } from "@/data/templates";
import { config } from "@/config";

/* Templates strip chips — popular starting points. Real templates link to their
   builder; the rest seed a search on the library. */
const CHIPS: { label: string; slug?: string }[] = [
  { label: "Weekly meal planner", slug: "weekly-meal-planner" },
  { label: "Cover letter", slug: "tailored-cover-letter" },
  { label: "Lesson plan · K-12", slug: "k12-lesson-plan" },
  { label: "Customer email reply", slug: "customer-email-reply" },
  { label: "Real estate listing", slug: "real-estate-listing" },
  { label: "Wedding toast", slug: "wedding-toast" },
  { label: "Workout plan", slug: "workout-plan" },
  { label: "React component scaffold", slug: "react-component-scaffold" },
  { label: "SQL query builder" },
  { label: "Birthday party invite" },
  { label: "Performance review draft", slug: "performance-review" },
  { label: "Pricing page copy" },
  { label: "D&D encounter" },
  { label: "Apology message" },
  { label: "Eulogy draft" },
];

function chipHref(c: { label: string; slug?: string }) {
  return c.slug ? `/templates/${c.slug}` : `/templates?q=${encodeURIComponent(c.label)}`;
}

export default function LandingPage() {
  return (
    <main className="landing">
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-inner">
          <div className="eyebrow">
            <span className="dot" />
            Free to use · Save your work · Works with any AI
          </div>
          <h1 className="display">
            Fill<span className="accent">.</span> Copy<span className="accent">.</span>{" "}
            Paste<span className="accent">.</span>
          </h1>
          <p className="sub">
            A prompt builder for everyone. Pick a template, fill out a short form,
            get a perfectly crafted prompt to paste into ChatGPT, Claude, or Gemini.
          </p>
          <div className="ctas">
            <Link className="btn btn-primary btn-lg" href="/templates">
              Try a template →
            </Link>
            <Link className="btn btn-ghost btn-lg" href="/how-it-works">
              See how it works
            </Link>
          </div>
          {/* live mini demo */}
          <div className="demo">
            <CrosshairCard className="form-side">
              <div className="demo-head">
                <span className="title">Weekly meal planner</span>
                <span className="pip">3 questions</span>
              </div>
              <div className="field">
                <label>
                  How many people? <span className="req">*</span>
                </label>
                <input
                  className="input"
                  defaultValue="A family of 4 (2 adults, 2 kids)"
                  readOnly
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
              <div className="field">
                <label>Any dietary preferences?</label>
                <select className="select" tabIndex={-1} aria-hidden="true">
                  <option>Vegetarian, no nuts</option>
                </select>
              </div>
              <div className="field">
                <label>Optional extras</label>
                <div className="check on">
                  <span className="box" />
                  <div>
                    <div className="label">Include a grocery list</div>
                  </div>
                </div>
              </div>
            </CrosshairCard>

            <CrosshairCard className="code-well dark output-side">
              <div className="code-bar">
                <span className="pip" />
                <span>prompt.md</span>
                <span className="tag">Copied</span>
              </div>
              <div className="code-body">
                <span className="c-mute"># Role</span>
                {"\n"}You are a friendly meal-planning assistant.{"\n"}
                {"\n"}
                <span className="c-mute"># Task</span>
                {"\n"}Plan a week of meals for{" "}
                <span className="c-acc">a family of 4</span>
                {"\n"}(2 adults, 2 kids).{"\n"}
                {"\n"}
                <span className="c-mute"># Preferences</span>
                {"\n"}- <span className="c-acc">Vegetarian, no nuts</span>
                {"\n"}- Keep recipes simple and kid-friendly{"\n"}
                {"\n"}
                <span className="c-mute"># Output</span>
                {"\n"}- 7 dinners with prep time{"\n"}-{" "}
                <span className="c-acc">Grocery list at the end</span>
              </div>
            </CrosshairCard>
          </div>

          <div className="trust">
            <span>
              <b>{TEMPLATES.length}</b> free templates
            </span>
            <span style={{ color: "var(--line-3)" }}>·</span>
            <span>
              <b>{CATEGORIES.length}</b> categories
            </span>
            <span style={{ color: "var(--line-3)" }}>·</span>
            <span>Works with ChatGPT, Claude &amp; Gemini</span>
          </div>
        </div>
      </section>

      {/* ============ STEPS ============ */}
      <section className="steps">
        <div className="steps-head">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="h2" style={{ marginTop: 14 }}>
            Three steps. No prompt-engineering required.
          </h2>
        </div>
        <div className="steps-grid">
          <div className="panel step">
            <div className="num">1</div>
            <h3 className="h3">Pick a template</h3>
            <p>
              Meal planning, cover letters, lesson plans, code snippets — a growing
              library, each one carefully designed.
            </p>
            <div className="pix" />
          </div>
          <div className="panel step">
            <div className="num">2</div>
            <h3 className="h3">Fill out the form</h3>
            <p>
              Plain questions. Type a few answers, skip the ones you don&apos;t care
              about. The prompt updates as you go.
            </p>
            <div
              className="pix"
              style={{ backgroundPosition: "0 100%, 12px 60%, 24px 100%, 36px 60%" }}
            />
          </div>
          <div className="panel step">
            <div className="num">3</div>
            <h3 className="h3">Copy and paste</h3>
            <p>
              One tap copies the finished prompt to your clipboard. Open your
              favorite AI, paste, and you&apos;re done.
            </p>
            <div
              className="pix"
              style={{ backgroundPosition: "0 60%, 12px 100%, 24px 60%, 36px 100%" }}
            />
          </div>
        </div>
      </section>

      {/* ============ WHO IT'S FOR ============ */}
      <section className="who">
        <div className="who-head">
          <h2 className="h2">No matter what you&apos;re trying to make.</h2>
        </div>
        <div className="who-grid">
          <Link className="panel who-card" href="/templates?category=education">
            <div className="icon">
              <Icon name="teacher" />
            </div>
            <h3>Teachers</h3>
            <p>
              Lesson plans, parent emails, rubrics — drafted in the time it takes to
              make coffee.
            </p>
          </Link>
          <Link className="panel who-card" href="/templates?category=marketing">
            <div className="icon">
              <Icon name="chart" />
            </div>
            <h3>Small business owners</h3>
            <p>
              Marketing copy, customer replies, ad headlines — without hiring a
              copywriter.
            </p>
          </Link>
          <Link className="panel who-card" href="/templates?category=writing">
            <div className="icon">
              <Icon name="briefcase" />
            </div>
            <h3>Job seekers</h3>
            <p>
              Cover letters tailored to each posting, interview prep, follow-up
              emails that land.
            </p>
          </Link>
          <Link className="panel who-card" href="/templates?category=code">
            <div className="icon">
              <Icon name="code" />
            </div>
            <h3>Developers</h3>
            <p>
              Component scaffolds, bug hunts, code reviews — with the right
              constraints baked in.
            </p>
          </Link>
        </div>
      </section>

      {/* ============ TEMPLATES ============ */}
      <section className="templates-strip">
        <div className="ts-head">
          <div>
            <Eyebrow>{TEMPLATES.length} templates and counting</Eyebrow>
            <h2 className="h2" style={{ marginTop: 14 }}>
              A starting point for whatever you need.
            </h2>
            <p className="ts-sub">
              Want something you can paste right now? Browse our{" "}
              <Link href="/prompts">ready-to-use prompts</Link> — finished examples you can copy or
              tweak.
            </p>
          </div>
          <Link className="btn btn-ghost btn-sm" href="/templates">
            Browse all →
          </Link>
        </div>
        <div className="chips">
          {CHIPS.map((c) => (
            <Link key={c.label} className="chip" href={chipHref(c)}>
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ============ PRICING TEASER ============ */}
      <section className="pricing-teaser">
        <div className="pt-inner">
          <div className="pt-copy">
            <h2 className="h2">The builder is free. Pro makes it sharper.</h2>
            <p>
              Every template works without paying a cent. Pro Boosters append
              expert blocks — role priming, strict output formats, per-model
              tuning — for {config.pricing.lifetime}.
            </p>
          </div>
          <Link className="btn btn-ghost" href="/pricing">
            See pricing →
          </Link>
        </div>
      </section>

      {/* ============ CLOSING ============ */}
      <section className="closing">
        <h2 className="h2">A perfect prompt is 30 seconds away.</h2>
        <p>Free to start. No credit card. No prompt-engineering YouTube tutorials.</p>
        <Link className="btn btn-primary btn-lg" href="/templates">
          Try a template →
        </Link>
      </section>
    </main>
  );
}

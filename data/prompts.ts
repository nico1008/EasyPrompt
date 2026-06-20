import type { IconName } from "@/components/iconNames";
import { CATEGORIES } from "@/data/templates";

/* The Prompts catalog — curated, ready-to-paste example Prompts (the counterpart
 * to the reusable Templates in data/templates.ts). A Prompt is a finished
 * instruction the user copies as-is, optionally customizes. Several map to a
 * catalog Template via `sourceTemplateSlug` so "Customize → open the form" can
 * route there; standalone examples have no source. Static + data-driven, mirroring
 * the Template catalog (no DB round-trip, SSG-friendly). Public listing of
 * *user-published* Prompts is a separate follow-up (needs a listing RPC). */

export type ExamplePrompt = {
  id: string;
  slug: string;
  /** Card + page title. */
  title: string;
  /** One-sentence card description. */
  blurb: string;
  /** Canonical category id (see CATEGORIES in data/templates.ts). */
  category: string;
  icon: IconName;
  /** Short tag shown on the card. */
  tag: string;
  /** The ready-to-paste prompt, in markdown. */
  body: string;
  /** When set, the Prompt was distilled from this catalog Template — enables the
   *  "Open the {Template} form" customize path. */
  sourceTemplateSlug?: string;
  /** Recency rank for the "New" sort (higher = newer). */
  added?: number;
  popular?: boolean;
};

export const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    id: "ex-weeknight-meal-plan",
    slug: "weeknight-meal-plan",
    title: "Weeknight family meal plan",
    blurb: "A week of simple, kid-friendly dinners with a tidy grocery list.",
    category: "life",
    icon: "meal",
    tag: "Meal planning",
    sourceTemplateSlug: "weekly-meal-planner",
    popular: true,
    added: 6,
    body: `# Role
You are a friendly, practical meal-planning assistant.

# Task
Plan 7 weeknight dinners for a family of 4 (2 adults, 2 kids aged 6 and 9).

# Constraints
- Vegetarian, no nuts.
- Each meal should take 30 minutes or less of active cooking.
- Keep ingredients affordable and easy to find at a regular grocery store.
- Vary the cuisines across the week; avoid repeating the same main ingredient two nights in a row.

# Output
- A numbered list of 7 dinners, each with a one-line description and an approximate prep time.
- A consolidated grocery list at the end, grouped by aisle (produce, dairy, pantry, etc.).
- Note any items I likely already have (salt, oil, common spices) separately so the shopping list stays short.`,
  },
  {
    id: "ex-swe-cover-letter",
    slug: "swe-cover-letter",
    title: "Software-engineer cover letter",
    blurb: "A tailored, confident cover letter that mirrors the job posting.",
    category: "writing",
    icon: "letter",
    tag: "Cover letter",
    sourceTemplateSlug: "tailored-cover-letter",
    popular: true,
    added: 6,
    body: `# Role
You are an expert career writer who crafts concise, specific cover letters that hiring managers actually read.

# Task
Write a cover letter for a Senior Frontend Engineer role at a mid-size SaaS company.

# About me
- 6 years building React/TypeScript apps; led a design-system rebuild used by 40+ engineers.
- Strengths: accessibility, performance, mentoring.
- Looking for more ownership over product direction.

# The posting emphasizes
Design systems, performance budgets, and cross-functional collaboration with design and product.

# Output
- 3–4 short paragraphs, under 300 words.
- Open with a specific hook, not "I am writing to apply."
- Tie two concrete achievements to what the posting asks for.
- Warm, confident tone — no clichés, no buzzword soup.
- End with a clear, low-pressure call to action.`,
  },
  {
    id: "ex-photosynthesis-lesson",
    slug: "k12-photosynthesis-lesson",
    title: "K-12 lesson: photosynthesis",
    blurb: "A 45-minute middle-school lesson plan with objectives and an exit ticket.",
    category: "education",
    icon: "teacher",
    tag: "Lesson plan",
    sourceTemplateSlug: "k12-lesson-plan",
    added: 5,
    body: `# Role
You are an experienced middle-school science teacher.

# Task
Create a 45-minute lesson plan introducing photosynthesis to a 7th-grade class.

# Audience
Mixed-ability class of 28 students; a few are English-language learners.

# Output
- **Learning objectives** (2–3, measurable).
- **Materials** needed.
- **Warm-up** (5 min) — a question or quick demo to hook curiosity.
- **Direct instruction** (15 min) — the core idea in plain language, with one analogy.
- **Guided activity** (15 min) — a hands-on or pair task.
- **Wrap-up + exit ticket** (10 min) — 2 questions that check understanding.
- One **differentiation tip** for ELL students and one **extension** for early finishers.`,
  },
  {
    id: "ex-refund-email-reply",
    slug: "refund-email-reply",
    title: "Polite refund-request reply",
    blurb: "A warm, professional customer reply that keeps goodwill while setting policy.",
    category: "work",
    icon: "email",
    tag: "Customer email",
    sourceTemplateSlug: "customer-email-reply",
    added: 4,
    body: `# Role
You are a calm, empathetic customer-support specialist.

# Task
Write a reply to a customer asking for a refund on an order that arrived 2 days outside our 30-day return window.

# Context
- The customer is otherwise happy with the product and has ordered from us before.
- Policy allows a one-time store credit as a goodwill exception.

# Output
- Acknowledge their frustration sincerely in the first line.
- Explain the policy briefly without sounding defensive.
- Offer the store-credit exception clearly, with the exact next step.
- Keep it under 150 words, friendly and human — no corporate stiffness.
- Sign off with a real invitation to reply if they have questions.`,
  },
  {
    id: "ex-modern-condo-listing",
    slug: "modern-condo-listing",
    title: "Modern condo listing",
    blurb: "An MLS-ready listing description that sells the lifestyle, not just the specs.",
    category: "marketing",
    icon: "house",
    tag: "Real estate",
    sourceTemplateSlug: "real-estate-listing",
    added: 4,
    body: `# Role
You are a top-producing real-estate copywriter.

# Task
Write a listing description for a 2-bed, 2-bath modern condo in a walkable downtown neighborhood.

# Details
- 1,050 sq ft, 8th floor, floor-to-ceiling windows, west-facing balcony.
- Renovated kitchen with quartz counters; in-unit laundry.
- Building has a gym, rooftop lounge, and secure parking.
- Steps from cafés, transit, and a riverfront park.

# Output
- A punchy headline (under 12 words).
- 2 short paragraphs that sell the lifestyle and the light.
- A bulleted "Highlights" list of 5–6 standout features.
- A warm closing line inviting a showing.
- Tone: aspirational but honest; no ALL-CAPS, no exclamation overload.`,
  },
  {
    id: "ex-best-man-toast",
    slug: "best-man-toast",
    title: "Heartfelt best-man toast",
    blurb: "A 2-minute wedding toast that lands a laugh and earns a tear.",
    category: "creative",
    icon: "toast",
    tag: "Wedding toast",
    sourceTemplateSlug: "wedding-toast",
    added: 3,
    body: `# Role
You are a warm, witty speechwriter.

# Task
Write a best-man toast for my brother's wedding, about 2 minutes when spoken aloud.

# About them
- The groom is my older brother, Daniel; I'm the younger one he taught to ride a bike.
- He met his partner, Aisha, in grad school over a shared love of terrible sci-fi movies.
- He's loyal, stubborn, and the first person everyone calls in a crisis.

# Output
- Open with a short, true story that shows who he is.
- One genuine laugh line — affectionate, never mean.
- A turn toward sincerity: what Aisha brings out in him.
- End on a toast everyone can raise a glass to.
- Conversational and personal — like I'm actually talking, not reading an essay.`,
  },
  {
    id: "ex-react-table-scaffold",
    slug: "react-table-scaffold",
    title: "Accessible React data-table",
    blurb: "A scaffold prompt for a typed, sortable, accessible table component.",
    category: "code",
    icon: "code",
    tag: "Component scaffold",
    sourceTemplateSlug: "react-component-scaffold",
    popular: true,
    added: 5,
    body: `# Role
You are a senior React engineer who writes clean, accessible, well-typed components.

# Task
Scaffold a reusable \`DataTable\` component in React + TypeScript.

# Requirements
- Generic over the row type: \`DataTable<T>\`.
- Props: \`columns\` (key, header, optional render + sort accessor), \`rows\`, \`onRowClick?\`.
- Client-side sorting by clickable column headers, with an accessible aria-sort state.
- Keyboard navigable; semantic \`<table>\` markup, not divs.
- No external table library — plain React.

# Output
- The full component code in one block.
- A short usage example with 3 sample columns.
- Brief notes on the accessibility decisions you made.
- Keep styling minimal (className hooks only); do not inline a design system.`,
  },
  {
    id: "ex-standup-update",
    slug: "standup-update",
    title: "Daily standup update",
    blurb: "Turn messy notes into a crisp yesterday / today / blockers update.",
    category: "work",
    icon: "briefcase",
    tag: "Standup",
    added: 2,
    body: `# Role
You are a concise engineering teammate writing an async standup update.

# Task
Turn my rough notes below into a clean standup post.

# My notes
\`\`\`
finished the login rate-limit thing, got review comments
started on the password reset email but stuck on the token expiry bug
need design to confirm the empty state for /my
\`\`\`

# Output
Format as three short sections:
- **Yesterday** — what shipped or moved.
- **Today** — what I'm focused on.
- **Blockers** — what I need from someone, with the name of who can unblock it.
Keep each bullet to one line. No filler, no "just." Professional but human.`,
  },
  {
    id: "ex-blog-outline-seo",
    slug: "blog-outline-seo",
    title: "SEO blog-post outline",
    blurb: "A search-friendly outline with H2s, intent, and a meta description.",
    category: "marketing",
    icon: "chart",
    tag: "Content outline",
    added: 3,
    body: `# Role
You are an SEO content strategist.

# Task
Create an outline for a blog post targeting the keyword "how to meal prep for beginners."

# Context
- Audience: busy first-timers who feel overwhelmed.
- Goal: rank on the first page and convert readers to our newsletter.

# Output
- A working **title** (under 60 characters) and a **meta description** (under 155 characters).
- The **search intent** in one sentence.
- A logical set of **H2 sections** (and key H3s) that fully answer the query.
- For each section, a one-line note on what to cover.
- 3 **related questions** to capture "People also ask."
- A suggested **call to action** for the newsletter.`,
  },
  {
    id: "ex-bug-repro-report",
    slug: "bug-repro-report",
    title: "Clear bug reproduction report",
    blurb: "Turn a vague complaint into a precise, reproducible bug report.",
    category: "code",
    icon: "wrench",
    tag: "Bug report",
    added: 2,
    body: `# Role
You are a meticulous QA engineer.

# Task
Rewrite my vague bug note into a clear, reproducible report a developer can act on.

# My note
"The save button doesn't work sometimes on mobile, I think after editing a long prompt."

# Output
A structured report with:
- **Summary** — one sentence.
- **Environment** — make reasonable assumptions and list what you'd confirm.
- **Steps to reproduce** — numbered, specific, minimal.
- **Expected vs. actual** result.
- **Severity** and a short **note on likely cause** (a hypothesis, clearly labeled as such).
- A list of **open questions** to confirm before filing.`,
  },
  {
    id: "ex-trip-itinerary-3day",
    slug: "trip-itinerary-3day",
    title: "3-day city trip itinerary",
    blurb: "A realistic, walkable weekend plan that isn't packed to exhaustion.",
    category: "life",
    icon: "book",
    tag: "Travel",
    added: 1,
    body: `# Role
You are a thoughtful local travel guide.

# Task
Plan a relaxed 3-day weekend itinerary for two adults visiting Lisbon for the first time.

# Preferences
- We like food, viewpoints, and walking; not big on museums.
- Moderate budget; one nicer dinner is fine.
- We'd rather do fewer things well than rush.

# Output
- A day-by-day plan (Morning / Afternoon / Evening), each with 2–3 anchor activities.
- One specific food recommendation per day with what to order.
- Realistic walking-distance grouping so we're not crossing the city twice.
- A "skip it" line per day — one famous thing that's not worth the time.
- Keep it friendly and concrete, with neighborhood names.`,
  },
  {
    id: "ex-linkedin-about",
    slug: "linkedin-about",
    title: "LinkedIn “About” section",
    blurb: "A first-person summary that sounds like you, not a press release.",
    category: "writing",
    icon: "user",
    tag: "LinkedIn",
    added: 1,
    body: `# Role
You are a personal-branding writer who keeps things human and specific.

# Task
Write a LinkedIn "About" section for me, in the first person.

# About me
- Product designer, 8 years, mostly fintech and developer tools.
- Known for turning fuzzy problems into shippable flows.
- Care about accessibility and writing clear UI copy.
- Currently open to lead/principal roles.

# Output
- 3 short paragraphs, first person, under 1,000 characters total.
- Open with a line that captures how I think, not my job title.
- Include one concrete result or example.
- End with what I'm looking for and an invitation to connect.
- Confident and warm — no "passionate about leveraging synergies."`,
  },
];

/* ----------------------------- helpers ----------------------------- */

export function getExamplePrompt(slug: string): ExamplePrompt | undefined {
  return EXAMPLE_PROMPTS.find((p) => p.slug === slug);
}

/** Count of example prompts in a category (or "all"). Derived, never hard-coded. */
export function promptCountFor(categoryId: string | "all"): number {
  if (categoryId === "all") return EXAMPLE_PROMPTS.length;
  return EXAMPLE_PROMPTS.filter((p) => p.category === categoryId).length;
}

/** Categories that actually have example prompts, in catalog order. */
export function promptCategories() {
  return CATEGORIES.filter((c) => promptCountFor(c.id) > 0);
}

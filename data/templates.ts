import type { Category, Template } from "./types";

/* Canonical categories. Counts are derived from the catalog at runtime, never
   hard-coded, so adding a template keeps the sidebar honest. */
export const CATEGORIES: Category[] = [
  { id: "life", label: "Life & home", emoji: "🍳" },
  { id: "writing", label: "Writing", emoji: "✏️" },
  { id: "education", label: "Education", emoji: "🎒" },
  { id: "work", label: "Work & business", emoji: "💼" },
  { id: "marketing", label: "Marketing", emoji: "📣" },
  { id: "creative", label: "Creative", emoji: "🎨" },
  { id: "code", label: "Code", emoji: "{ }" },
];

export const TEMPLATES: Template[] = [
  /* ---------------------------------------------------------------- 01 */
  {
    id: "meal-planner",
    slug: "weekly-meal-planner",
    category: "life",
    tag: "Life",
    icon: "meal",
    seo_title: "AI Weekly Meal Planner Prompt Generator",
    seo_description:
      "Generate a tailored weekly meal-plan prompt for ChatGPT, Claude, or Gemini based on your family size, dietary preferences, and budget — grocery list included.",
    blurb:
      "Plan a week of meals around your family size, dietary preferences, and budget. Outputs a grocery list, too.",
    intro:
      "A few quick questions about your week — we'll write the perfect prompt for it.",
    uses: "12.4k",
    popular: true,
    added: 6,
    base_prompt:
      "# Role\nYou are a friendly meal-planning assistant.\nWrite in a warm, casual tone — like a friend texting recipe ideas, not a chef on TV.",
    fields: [
      {
        id: "people",
        type: "text",
        label: "How many people?",
        placeholder: "e.g., a family of 4 (2 adults, 2 kids ages 7 and 10)",
        required: true,
        prefix: "\n\n# Who you're cooking for\n",
      },
      {
        id: "diet",
        type: "textarea",
        label: "Any dietary preferences or restrictions?",
        placeholder:
          "e.g., vegetarian, no nuts (allergy), trying to limit processed sugar",
        helper: "List anything to avoid — we'll tell the AI to honor it.",
        prefix: "\n\n# Preferences\n",
      },
      {
        id: "time",
        type: "pills",
        label: "Weeknight cooking time",
        options: ["15 min", "30 min", "45+ min"],
        default: "30 min",
        prefix: "\n\n# Constraints\n- Weeknight meals: ≤ ",
      },
      {
        id: "budget",
        type: "pills",
        label: "Budget",
        options: ["Tight", "Moderate", "No limit"],
        default: "Moderate",
        prefix: "\n- Budget: ",
      },
    ],
    checkboxes: [
      {
        id: "grocery",
        label: "Grocery list",
        sub: "Organized by aisle",
        injected_text:
          "\n\n# Output\n- A categorized grocery list at the end, organized by aisle, with estimated quantities.",
        default: true,
      },
      {
        id: "prep",
        label: "Prep times",
        sub: "For each meal",
        injected_text: "\n- Exact prep and cook time for every meal.",
        default: true,
      },
      {
        id: "leftovers",
        label: "Leftovers strategy",
        sub: "What to repurpose",
        injected_text:
          "\n- A short leftovers strategy: which dishes to make extra of and how to repurpose them.",
      },
      {
        id: "nutrition",
        label: "Nutrition info",
        sub: "Calories & macros",
        injected_text:
          "\n- Approximate calories and macros (protein / carbs / fat) per serving.",
      },
    ],
  },

  /* ---------------------------------------------------------------- 02 */
  {
    id: "cover-letter",
    slug: "tailored-cover-letter",
    category: "writing",
    tag: "Writing",
    icon: "letter",
    seo_title: "AI Cover Letter Prompt Generator",
    seo_description:
      "Paste a job posting and your background to generate a cover-letter prompt that produces a tailored, human-sounding letter — not robotic filler.",
    blurb:
      "Paste a job posting, add your story, get a letter that doesn't read like a robot wrote it.",
    intro:
      "Tell us about the role and a little about you — we'll craft a prompt for a letter that sounds like a person.",
    uses: "9.1k",
    added: 5,
    base_prompt:
      "# Role\nYou are an experienced career coach and copywriter. Write a cover letter that sounds genuinely human — specific, warm, and confident without bragging.",
    fields: [
      {
        id: "role",
        type: "text",
        label: "What role are you applying for?",
        placeholder: "e.g., Senior Product Designer at Atlas Labs",
        required: true,
        prefix: "\n\n# The role\n",
      },
      {
        id: "posting",
        type: "textarea",
        label: "Paste the job posting (or the key requirements)",
        placeholder: "Paste the responsibilities and must-haves here…",
        helper: "The more you paste, the more tailored the letter.",
        prefix:
          "\n\n# Job posting\nMatch the letter to these requirements:\n",
      },
      {
        id: "background",
        type: "textarea",
        label: "A few things about your background",
        placeholder:
          "e.g., 6 years in fintech, led the redesign that lifted activation 22%…",
        prefix: "\n\n# My background\n",
      },
      {
        id: "tone",
        type: "select",
        label: "Tone",
        options: ["Warm and personable", "Confident and direct", "Formal and polished"],
        default: "Warm and personable",
        prefix: "\n\n# Tone\nWrite it: ",
      },
      {
        id: "length",
        type: "pills",
        label: "Length",
        options: ["Short (200 words)", "Standard (350 words)", "Detailed"],
        default: "Standard (350 words)",
        prefix: "\n\n# Length\n",
      },
    ],
    checkboxes: [
      {
        id: "hook",
        label: "Strong opening hook",
        sub: "Skip the boilerplate",
        injected_text:
          "\n\n# Requirements\n- Open with a specific hook, not \"I am writing to apply for…\".",
        default: true,
      },
      {
        id: "metrics",
        label: "Quantify impact",
        sub: "Use real numbers",
        injected_text:
          "\n- Quantify achievements with concrete numbers wherever possible.",
        default: true,
      },
      {
        id: "values",
        label: "Mirror company values",
        sub: "From the posting",
        injected_text:
          "\n- Reflect the company's stated values and language from the posting.",
      },
    ],
  },

  /* ---------------------------------------------------------------- 03 */
  {
    id: "lesson-plan",
    slug: "k12-lesson-plan",
    category: "education",
    tag: "Education",
    icon: "lesson",
    seo_title: "AI K-12 Lesson Plan Prompt Generator",
    seo_description:
      "Create a standards-aligned, time-boxed K-12 lesson-plan prompt with objectives, discussion questions, and a quick rubric for any grade and subject.",
    blurb:
      "Standards-aligned, time-boxed, with discussion questions and a quick rubric.",
    intro:
      "Tell us the grade, subject, and topic — we'll build a prompt for a ready-to-teach plan.",
    uses: "8.3k",
    added: 4,
    base_prompt:
      "# Role\nYou are a veteran K-12 teacher and curriculum designer. Produce a clear, standards-aligned lesson plan a substitute could follow.",
    fields: [
      {
        id: "grade",
        type: "select",
        label: "Grade level",
        options: [
          "Kindergarten",
          "Grades 1–2",
          "Grades 3–5",
          "Middle school (6–8)",
          "High school (9–12)",
        ],
        default: "Grades 3–5",
        required: true,
        prefix: "\n\n# Grade level\n",
      },
      {
        id: "subject",
        type: "text",
        label: "Subject",
        placeholder: "e.g., Science, ELA, US History",
        required: true,
        prefix: "\n\n# Subject\n",
      },
      {
        id: "topic",
        type: "text",
        label: "Topic for this lesson",
        placeholder: "e.g., the water cycle, persuasive essays, the Bill of Rights",
        required: true,
        prefix: "\n\n# Topic\n",
      },
      {
        id: "duration",
        type: "pills",
        label: "Class length",
        options: ["30 min", "45 min", "60 min", "90 min"],
        default: "45 min",
        prefix: "\n\n# Duration\nDesign it for a ",
      },
      {
        id: "standard",
        type: "text",
        label: "Standard to align to (optional)",
        placeholder: "e.g., NGSS 5-ESS2-1, Common Core RL.4.2",
        prefix: "\n\n# Standard\nAlign to: ",
      },
    ],
    checkboxes: [
      {
        id: "objectives",
        label: "Learning objectives",
        sub: "Measurable, up top",
        injected_text:
          "\n\n# Output\n- Start with 2–3 measurable learning objectives.",
        default: true,
      },
      {
        id: "discussion",
        label: "Discussion questions",
        sub: "To spark talk",
        injected_text: "\n- Include 4–5 discussion questions.",
        default: true,
      },
      {
        id: "rubric",
        label: "Quick rubric",
        sub: "For assessment",
        injected_text:
          "\n- End with a short 3-level rubric for assessing the activity.",
        default: true,
      },
      {
        id: "differentiation",
        label: "Differentiation",
        sub: "Support & extension",
        injected_text:
          "\n- Add a differentiation note: one support scaffold and one extension.",
      },
    ],
  },

  /* ---------------------------------------------------------------- 04 */
  {
    id: "customer-email-reply",
    slug: "customer-email-reply",
    category: "work",
    tag: "Business",
    icon: "email",
    seo_title: "AI Customer Email Reply Prompt Generator",
    seo_description:
      "Generate a prompt for a calm, de-escalating customer-service reply that acknowledges the issue and offers a concrete next step.",
    blurb:
      "For when a customer is frustrated. De-escalates, acknowledges, offers a real next step.",
    intro:
      "Paste the customer's message and the facts — we'll write a prompt for a reply that lands well.",
    uses: "6.7k",
    added: 3,
    base_prompt:
      "# Role\nYou are a calm, empathetic customer-support specialist. Write a reply that de-escalates, takes responsibility where fair, and moves toward a solution.",
    fields: [
      {
        id: "message",
        type: "textarea",
        label: "What did the customer say?",
        placeholder: "Paste their message or summarize the complaint…",
        required: true,
        prefix: "\n\n# The customer's message\n",
      },
      {
        id: "situation",
        type: "textarea",
        label: "What actually happened? (the facts on your side)",
        placeholder:
          "e.g., order shipped 3 days late due to a warehouse outage; refund already issued",
        prefix: "\n\n# What happened\n",
      },
      {
        id: "resolution",
        type: "text",
        label: "What can you offer?",
        placeholder: "e.g., a full refund + 20% off the next order",
        prefix: "\n\n# What we can offer\n",
      },
      {
        id: "tone",
        type: "select",
        label: "Tone",
        options: [
          "Warm and apologetic",
          "Professional and neutral",
          "Friendly and upbeat",
        ],
        default: "Warm and apologetic",
        prefix: "\n\n# Tone\nWrite it: ",
      },
    ],
    checkboxes: [
      {
        id: "apology",
        label: "Lead with acknowledgement",
        sub: "Before any policy",
        injected_text:
          "\n\n# Requirements\n- Open by acknowledging their frustration before explaining anything.",
        default: true,
      },
      {
        id: "nextstep",
        label: "End with one clear next step",
        sub: "No dead ends",
        injected_text: "\n- Close with a single, concrete next step.",
        default: true,
      },
      {
        id: "short",
        label: "Keep it under 150 words",
        sub: "Scannable",
        injected_text: "\n- Keep the whole reply under 150 words.",
      },
    ],
  },

  /* ---------------------------------------------------------------- 05 */
  {
    id: "real-estate-listing",
    slug: "real-estate-listing",
    category: "marketing",
    tag: "Marketing",
    icon: "house",
    seo_title: "AI Real Estate Listing Prompt Generator",
    seo_description:
      "Generate a prompt for a punchy property listing with a strong lede, room-by-room highlights, and a soft call-to-action — for agents and FSBOs.",
    blurb:
      "Snappy lede, room-by-room features, soft call-to-action. Works for agents and FSBOs.",
    intro:
      "Give us the property basics — we'll build a prompt for a listing that sells.",
    uses: "4.2k",
    added: 2,
    base_prompt:
      "# Role\nYou are a top-producing real-estate copywriter. Write a listing that's vivid and honest, with a strong opening line and a soft call-to-action.",
    fields: [
      {
        id: "property",
        type: "text",
        label: "Property type & basics",
        placeholder: "e.g., 3 bed / 2 bath bungalow, 1,450 sq ft, built 1962",
        required: true,
        prefix: "\n\n# Property\n",
      },
      {
        id: "location",
        type: "text",
        label: "Neighborhood / location",
        placeholder: "e.g., walkable to downtown Bend, quiet cul-de-sac",
        prefix: "\n\n# Location\n",
      },
      {
        id: "features",
        type: "textarea",
        label: "Standout features",
        placeholder:
          "e.g., renovated kitchen, south-facing garden, new roof, two-car garage",
        prefix: "\n\n# Features\n",
      },
      {
        id: "audience",
        type: "select",
        label: "Who's the buyer?",
        options: [
          "First-time buyers",
          "Growing families",
          "Downsizers",
          "Investors",
        ],
        default: "Growing families",
        prefix: "\n\n# Target buyer\nWrite for: ",
      },
    ],
    checkboxes: [
      {
        id: "roombyroom",
        label: "Room-by-room walkthrough",
        sub: "Guided flow",
        injected_text:
          "\n\n# Structure\n- Include a brief room-by-room walkthrough.",
        default: true,
      },
      {
        id: "cta",
        label: "Soft call-to-action",
        sub: "Invite a showing",
        injected_text:
          "\n- End with a soft call-to-action inviting a showing.",
        default: true,
      },
      {
        id: "fairhousing",
        label: "Fair-housing safe language",
        sub: "Avoid violations",
        injected_text:
          "\n- Keep all language fair-housing compliant — describe the home, never the ideal occupant.",
        default: true,
      },
    ],
  },

  /* ---------------------------------------------------------------- 06 */
  {
    id: "wedding-toast",
    slug: "wedding-toast",
    category: "creative",
    tag: "Creative",
    icon: "toast",
    seo_title: "AI Wedding Toast Prompt Generator",
    seo_description:
      "Generate a prompt for a heartfelt, funny-but-sincere wedding toast built around two real memories and a clean story arc.",
    blurb: "Story arc, two real memories, sincere close. Avoids all the clichés.",
    intro:
      "A few details about the couple and how you know them — we'll prompt a toast worth standing up for.",
    uses: "3.6k",
    added: 1,
    base_prompt:
      "# Role\nYou are a warm, witty speechwriter. Draft a wedding toast with a clear arc: open with a laugh, build to sincerity, land on a heartfelt wish. Avoid clichés.",
    fields: [
      {
        id: "couple",
        type: "text",
        label: "Who's getting married?",
        placeholder: "e.g., Priya and Sam",
        required: true,
        prefix: "\n\n# The couple\n",
      },
      {
        id: "relationship",
        type: "text",
        label: "How do you know them?",
        placeholder: "e.g., I'm the bride's older brother",
        prefix: "\n\n# My relationship to them\n",
      },
      {
        id: "memories",
        type: "textarea",
        label: "One or two real memories",
        placeholder:
          "e.g., the road trip where we got hopelessly lost; the day she introduced me to Sam",
        helper: "Specifics beat clichés every time — give us the real ones.",
        prefix:
          "\n\n# Memories to weave in\nUse these specific moments:\n",
      },
      {
        id: "vibe",
        type: "pills",
        label: "Overall vibe",
        options: ["Funny", "Balanced", "Heartfelt"],
        default: "Balanced",
        prefix: "\n\n# Vibe\nLean: ",
      },
    ],
    checkboxes: [
      {
        id: "length",
        label: "Keep it to ~2 minutes",
        sub: "About 300 words",
        injected_text:
          "\n\n# Constraints\n- Keep it to roughly two minutes spoken (~300 words).",
        default: true,
      },
      {
        id: "raiseglass",
        label: "End on a toast",
        sub: "\"Raise your glass…\"",
        injected_text:
          "\n- End by inviting everyone to raise a glass.",
        default: true,
      },
      {
        id: "cleanjokes",
        label: "Keep the jokes clean",
        sub: "Grandma's in the room",
        injected_text: "\n- Keep all humor warm and family-friendly.",
      },
    ],
  },

  /* ---------------------------------------------------------------- 07 */
  {
    id: "workout-plan",
    slug: "workout-plan",
    category: "life",
    tag: "Life",
    icon: "workout",
    seo_title: "AI Workout Plan Prompt Generator",
    seo_description:
      "Generate a prompt for a goal-based, equipment-aware weekly workout plan with sensible progression and built-in rest days.",
    blurb:
      "Goal-based split, equipment-aware, week-by-week with rest days built in.",
    intro:
      "Tell us your goal and what you've got to train with — we'll prompt a plan you'll actually follow.",
    uses: "3.4k",
    added: 2,
    base_prompt:
      "# Role\nYou are a certified strength coach. Build a safe, realistic weekly workout plan with clear progression and built-in recovery.",
    fields: [
      {
        id: "goal",
        type: "select",
        label: "Main goal",
        options: [
          "Build muscle",
          "Lose fat",
          "Get stronger",
          "General fitness",
          "Train for a race",
        ],
        default: "General fitness",
        required: true,
        prefix: "\n\n# Goal\n",
      },
      {
        id: "experience",
        type: "pills",
        label: "Experience level",
        options: ["Beginner", "Intermediate", "Advanced"],
        default: "Beginner",
        prefix: "\n\n# Experience\n",
      },
      {
        id: "days",
        type: "pills",
        label: "Days per week",
        options: ["2", "3", "4", "5+"],
        default: "3",
        prefix: "\n\n# Frequency\nTrain ",
      },
      {
        id: "equipment",
        type: "textarea",
        label: "What equipment do you have?",
        placeholder: "e.g., a pair of adjustable dumbbells and a pull-up bar at home",
        prefix: "\n\n# Equipment\nOnly use: ",
      },
      {
        id: "limits",
        type: "text",
        label: "Any injuries or limitations?",
        placeholder: "e.g., cranky left knee — go easy on deep squats",
        prefix: "\n\n# Limitations\nWork around: ",
      },
    ],
    checkboxes: [
      {
        id: "progression",
        label: "Week-by-week progression",
        sub: "4-week block",
        injected_text:
          "\n\n# Output\n- Lay it out as a 4-week block with progressive overload.",
        default: true,
      },
      {
        id: "rest",
        label: "Built-in rest days",
        sub: "Recovery matters",
        injected_text: "\n- Include explicit rest and recovery days.",
        default: true,
      },
      {
        id: "warmup",
        label: "Warm-up & cooldown",
        sub: "Each session",
        injected_text:
          "\n- Add a short warm-up and cooldown for each session.",
      },
    ],
  },

  /* ---------------------------------------------------------------- 08 */
  {
    id: "react-component",
    slug: "react-component-scaffold",
    category: "code",
    tag: "Code",
    icon: "code",
    seo_title: "AI React Component Prompt Generator",
    seo_description:
      "Generate a prompt for a production-quality React component scaffold with typed props, accessibility hooks, and a styling approach of your choice.",
    blurb:
      "Typed props, ARIA hooks, styling variant. Production-quality scaffold in one shot.",
    intro:
      "Describe the component you need — we'll prompt a clean, typed, accessible scaffold.",
    uses: "3.1k",
    added: 3,
    base_prompt:
      "# Role\nYou are a senior frontend engineer. Produce a clean, production-quality React component with sensible defaults and no placeholder TODOs.",
    fields: [
      {
        id: "component",
        type: "text",
        label: "What component?",
        placeholder: "e.g., a multi-select Combobox with async search",
        required: true,
        prefix: "\n\n# Component\nBuild: ",
      },
      {
        id: "props",
        type: "textarea",
        label: "Key props / behavior",
        placeholder:
          "e.g., value, onChange, options, loading state, keyboard nav, clearable",
        prefix: "\n\n# Props & behavior\n",
      },
      {
        id: "language",
        type: "pills",
        label: "Language",
        options: ["TypeScript", "JavaScript"],
        default: "TypeScript",
        prefix: "\n\n# Language\nUse ",
      },
      {
        id: "styling",
        type: "select",
        label: "Styling approach",
        options: ["Tailwind CSS", "CSS Modules", "styled-components", "Plain CSS"],
        default: "Tailwind CSS",
        prefix: "\n\n# Styling\nStyle with: ",
      },
    ],
    checkboxes: [
      {
        id: "a11y",
        label: "Accessibility hooks",
        sub: "ARIA + keyboard",
        injected_text:
          "\n\n# Requirements\n- Include proper ARIA roles and full keyboard support.",
        default: true,
      },
      {
        id: "types",
        label: "Exported prop types",
        sub: "Typed public API",
        injected_text:
          "\n- Export a typed props interface as the public API.",
        default: true,
      },
      {
        id: "tests",
        label: "Usage example + test",
        sub: "Show it working",
        injected_text:
          "\n- End with a usage example and one basic unit test.",
      },
      {
        id: "comments",
        label: "Explain the tricky parts",
        sub: "Inline comments",
        injected_text:
          "\n- Add brief inline comments only where the logic is non-obvious.",
      },
    ],
  },

  /* ---------------------------------------------------------------- 09 */
  {
    id: "performance-review",
    slug: "performance-review",
    category: "work",
    tag: "Work",
    icon: "review",
    seo_title: "AI Performance Review Prompt Generator",
    seo_description:
      "Generate a prompt for a balanced performance review — strengths, growth areas, and concrete examples — that's honest without being harsh.",
    blurb:
      "Strengths, growth areas, concrete examples. Honest without being harsh.",
    intro:
      "A few notes about the person and the period — we'll prompt a fair, useful review.",
    uses: "2.2k",
    added: 1,
    base_prompt:
      "# Role\nYou are a thoughtful people manager. Write a balanced performance review that is specific, fair, and growth-oriented — honest without being harsh.",
    fields: [
      {
        id: "person",
        type: "text",
        label: "Who's the review for?",
        placeholder: "e.g., Marcus, a mid-level backend engineer",
        required: true,
        prefix: "\n\n# Subject\nThe review is for: ",
      },
      {
        id: "period",
        type: "pills",
        label: "Review period",
        options: ["Quarterly", "Mid-year", "Annual"],
        default: "Annual",
        prefix: "\n\n# Period\n",
      },
      {
        id: "strengths",
        type: "textarea",
        label: "Strengths & wins",
        placeholder: "e.g., shipped the billing migration; mentors two juniors well",
        prefix: "\n\n# Strengths to highlight\n",
      },
      {
        id: "growth",
        type: "textarea",
        label: "Growth areas",
        placeholder:
          "e.g., communication in cross-team reviews; estimating scope realistically",
        prefix: "\n\n# Growth areas\n",
      },
    ],
    checkboxes: [
      {
        id: "examples",
        label: "Back every point with an example",
        sub: "No vague praise",
        injected_text:
          "\n\n# Requirements\n- Support each strength and growth area with a concrete example.",
        default: true,
      },
      {
        id: "goals",
        label: "Suggest next-period goals",
        sub: "2–3 SMART goals",
        injected_text:
          "\n- End with 2–3 specific, measurable goals for next period.",
        default: true,
      },
      {
        id: "tone",
        label: "Keep the tone warm",
        sub: "Coaching, not grading",
        injected_text:
          "\n- Frame everything as coaching, not judgment.",
      },
    ],
  },
];

/* ---- Lookup helpers ---- */

/* Short, human display titles (the seo_title is the long, keyword-rich form). */
const TITLES: Record<string, string> = {
  "meal-planner": "Weekly meal planner",
  "cover-letter": "Tailored cover letter",
  "lesson-plan": "K-12 lesson plan",
  "customer-email-reply": "Customer email reply",
  "real-estate-listing": "Real estate listing",
  "wedding-toast": "Wedding toast draft",
  "workout-plan": "Workout plan",
  "react-component": "React component",
  "performance-review": "Performance review",
};

export function displayTitle(t: Template): string {
  return TITLES[t.id] ?? t.seo_title;
}

export function getTemplate(slug: string): Template | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function countFor(categoryId: string | "all"): number {
  if (categoryId === "all") return TEMPLATES.length;
  return TEMPLATES.filter((t) => t.category === categoryId).length;
}

/** Templates in the same category, excluding the given slug — for "Keep going". */
export function relatedTemplates(slug: string, limit = 3): Template[] {
  const current = getTemplate(slug);
  if (!current) return TEMPLATES.slice(0, limit);
  const sameCat = TEMPLATES.filter(
    (t) => t.category === current.category && t.slug !== slug
  );
  const fill = TEMPLATES.filter(
    (t) => t.category !== current.category && t.slug !== slug
  );
  return [...sameCat, ...fill].slice(0, limit);
}

/** Total fields + checkboxes — drives the "N of M" progress meter. */
export function questionCount(t: Template): number {
  return t.fields.length + t.checkboxes.length;
}

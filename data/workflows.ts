import type { Category } from "@/data/types";
import {
  CATEGORIES,
  categoryLabel,
  displayTitle,
  getTemplate,
} from "@/data/templates";
import { getExamplePrompt } from "@/data/prompts";

export type WorkflowLinkedItem = {
  type: "template" | "prompt";
  slug: string;
  note?: string;
};

export type WorkflowInlinePrompt = {
  id: string;
  title: string;
  body: string;
};

export type WorkflowStep = {
  id: string;
  title: string;
  duration: string;
  explanation: string;
  linkedItems?: WorkflowLinkedItem[];
  inlinePrompts?: WorkflowInlinePrompt[];
  deliverables: string[];
  tips: string[];
};

export type Workflow = {
  id: string;
  slug: string;
  category: string;
  title: string;
  blurb: string;
  overview: string;
  prerequisites: string[];
  timeLabel: string;
  seoTitle: string;
  seoDescription: string;
  popular?: boolean;
  added?: number;
  steps: WorkflowStep[];
};

export type WorkflowLinkedItemDetail = WorkflowLinkedItem & {
  title: string;
  href: string;
  label: "Template" | "Prompt";
};

export type WorkflowToolMix = {
  templates: number;
  linkedPrompts: number;
  inlinePrompts: number;
  label: string;
};

export const WORKFLOWS: Workflow[] = [
  {
    id: "job-application-pack",
    slug: "job-application-pack",
    category: "writing",
    title: "Job application pack",
    blurb: "Turn a target role into a focused cover letter, profile refresh, story bank, and follow-up note.",
    overview:
      "Use this when you have a real job posting and need a complete application pass, not just one cover letter.",
    prerequisites: [
      "The target job posting or role summary",
      "Your resume, portfolio, or work history notes",
      "Two or three concrete achievements you can prove",
    ],
    timeLabel: "45 min active prompt time",
    seoTitle: "Job Application Workflow For AI Prompts",
    seoDescription:
      "Use this EasyPrompt workflow to plan a focused job application with a cover letter, profile summary, interview stories, and follow-up note.",
    popular: true,
    added: 7,
    steps: [
      {
        id: "role-evidence-map",
        title: "Map the role to your evidence",
        duration: "8 min active prompt time",
        explanation:
          "Create a tight match between what the role asks for and what you can honestly show.",
        inlinePrompts: [
          {
            id: "role-evidence-map-prompt",
            title: "Role evidence map",
            body: `You are a practical career coach.

Build a role evidence map from the job posting and my background notes.

Inputs:
- Job posting:
- My resume or background notes:
- Achievements I can prove:

Return:
- The 5 most important role requirements
- The strongest evidence I have for each requirement
- Gaps I should avoid overclaiming
- Phrases from the posting that are worth echoing naturally`,
          },
        ],
        deliverables: ["Role requirement map", "Evidence list", "Gap list"],
        tips: [
          "Use only evidence you can explain in an interview.",
          "Keep weak matches out of the cover letter.",
        ],
      },
      {
        id: "cover-letter",
        title: "Draft the cover letter",
        duration: "12 min active prompt time",
        explanation:
          "Use the Template when the role needs a custom letter. Use the linked Prompt as a finished example for tone.",
        linkedItems: [
          {
            type: "template",
            slug: "tailored-cover-letter",
            note: "Best when you want a tailored draft from your own details.",
          },
          {
            type: "prompt",
            slug: "swe-cover-letter",
            note: "Useful as a ready example for a software role.",
          },
        ],
        deliverables: ["One tailored cover letter draft"],
        tips: [
          "Lead with fit, not enthusiasm alone.",
          "Cut generic claims before sending.",
        ],
      },
      {
        id: "profile-summary",
        title: "Refresh your profile summary",
        duration: "8 min active prompt time",
        explanation:
          "Turn the same evidence into a first-person summary that supports the application.",
        linkedItems: [
          {
            type: "prompt",
            slug: "linkedin-about",
            note: "Use when the application depends on your public profile.",
          },
        ],
        deliverables: ["Updated About section", "Two headline options"],
        tips: [
          "Avoid repeating the cover letter sentence for sentence.",
          "Keep the summary broader than one role.",
        ],
      },
      {
        id: "interview-story-bank",
        title: "Prepare interview stories",
        duration: "12 min active prompt time",
        explanation:
          "Convert your strongest evidence into stories you can answer with quickly.",
        inlinePrompts: [
          {
            id: "story-bank-prompt",
            title: "Interview story bank",
            body: `You are an interview coach.

Turn these achievements into concise interview stories using situation, action, result, and lesson.

Inputs:
- Target role:
- Requirements to emphasize:
- Achievements:

Return 5 stories. For each story include:
- Best interview question it answers
- 45-second version
- 2-minute version
- Metrics or proof to mention
- Follow-up details I should be ready to explain`,
          },
        ],
        deliverables: ["Five interview stories", "Short and long versions"],
        tips: [
          "Choose stories that show judgment, not only output.",
          "Keep one story ready for a failure or conflict question.",
        ],
      },
      {
        id: "follow-up-note",
        title: "Write a follow-up note",
        duration: "5 min quick pass",
        explanation:
          "Draft a short follow-up that references the conversation without sounding scripted.",
        inlinePrompts: [
          {
            id: "follow-up-note-prompt",
            title: "Post-interview follow-up",
            body: `Write a concise post-interview follow-up note.

Inputs:
- Interviewer's name:
- Role:
- One specific topic we discussed:
- One reason I am still interested:
- Any promised material or next step:

Constraints:
- Warm and specific
- Under 130 words
- No exaggerated enthusiasm
- End with a clear thank you`,
          },
        ],
        deliverables: ["Follow-up email draft"],
        tips: [
          "Mention one real discussion point.",
          "Send it only after checking names and details.",
        ],
      },
    ],
  },
  {
    id: "content-campaign-plan",
    slug: "content-campaign-plan",
    category: "marketing",
    title: "Content campaign plan",
    blurb: "Plan a focused campaign from audience angle to anchor article, repurposed posts, and weekly status.",
    overview:
      "Use this to turn one campaign goal into a usable content plan without asking the AI for a vague calendar.",
    prerequisites: [
      "A campaign goal",
      "Target audience or customer segment",
      "Offer, launch, or message to support",
    ],
    timeLabel: "50 min active prompt time",
    seoTitle: "Content Campaign Workflow For AI Prompts",
    seoDescription:
      "Plan a focused AI-assisted content campaign with audience angles, an SEO outline, channel variants, and a weekly review loop.",
    popular: true,
    added: 6,
    steps: [
      {
        id: "campaign-brief",
        title: "Write the campaign brief",
        duration: "10 min active prompt time",
        explanation:
          "Start by forcing the audience, promise, proof, and constraint decisions into one brief.",
        inlinePrompts: [
          {
            id: "campaign-brief-prompt",
            title: "Campaign brief builder",
            body: `You are a senior content strategist.

Create a campaign brief from these notes.

Inputs:
- Campaign goal:
- Audience:
- Offer or message:
- Proof points:
- Channels available:
- Constraints:

Return:
- Audience problem
- Core promise
- 3 message angles
- Proof needed for each angle
- Channel fit notes
- What not to say`,
          },
        ],
        deliverables: ["Campaign brief", "Message angles", "Channel fit notes"],
        tips: [
          "Do not ask for content ideas before the brief is clear.",
          "Name what the campaign should avoid.",
        ],
      },
      {
        id: "anchor-outline",
        title: "Create the anchor article",
        duration: "12 min active prompt time",
        explanation:
          "Use the linked Prompt when the campaign needs an article or guide as its main asset.",
        linkedItems: [
          {
            type: "prompt",
            slug: "blog-outline-seo",
            note: "Fits when search intent matters for the campaign.",
          },
        ],
        deliverables: ["SEO outline", "Search intent notes", "Draft structure"],
        tips: [
          "Skip this step for campaigns that are not article-led.",
          "Keep the outline aligned to the campaign promise.",
        ],
      },
      {
        id: "channel-variants",
        title: "Generate channel variants",
        duration: "14 min active prompt time",
        explanation:
          "Turn the anchor message into platform-specific drafts without flattening every channel into the same copy.",
        inlinePrompts: [
          {
            id: "channel-variants-prompt",
            title: "Channel variant drafts",
            body: `You are a channel editor.

Turn this campaign brief into channel-specific content drafts.

Inputs:
- Campaign brief:
- Anchor article outline or core message:
- Channels:
- Brand voice:

Return:
- 3 LinkedIn post drafts
- 3 short email subject lines and preview lines
- 5 social post hooks
- 2 newsletter angles
- Notes on what changes by channel and why`,
          },
        ],
        deliverables: ["Channel drafts", "Hooks", "Email subject lines"],
        tips: [
          "Ask for variants by channel, not one generic version.",
          "Keep claims consistent across every format.",
        ],
      },
      {
        id: "campaign-calendar",
        title: "Sequence the campaign",
        duration: "8 min active prompt time",
        explanation:
          "Arrange the pieces into a short sequence that a real team can execute.",
        inlinePrompts: [
          {
            id: "campaign-calendar-prompt",
            title: "Campaign sequence",
            body: `Build a 2-week content campaign sequence.

Inputs:
- Campaign brief:
- Available content assets:
- Channels:
- Team capacity:

Return a simple table with:
- Day
- Channel
- Asset or draft needed
- Goal of the touch
- Owner
- Reuse notes`,
          },
        ],
        deliverables: ["Two-week campaign sequence", "Reuse notes"],
        tips: [
          "Sequence by audience readiness, not by content format.",
          "Leave room for review and edits.",
        ],
      },
      {
        id: "review-loop",
        title: "Create the weekly review loop",
        duration: "6 min quick pass",
        explanation:
          "Define what you will check so the campaign can improve after launch.",
        inlinePrompts: [
          {
            id: "review-loop-prompt",
            title: "Weekly campaign review",
            body: `Create a weekly campaign review template.

Inputs:
- Campaign goal:
- Channels:
- Metrics available:
- Qualitative signals:

Return:
- 5 metrics to review
- 5 qualitative signals to capture
- A weekly summary format
- Decisions the review should trigger`,
          },
        ],
        deliverables: ["Review template", "Decision triggers"],
        tips: [
          "Include qualitative feedback, not only clicks.",
          "Tie each metric to a decision.",
        ],
      },
    ],
  },
  {
    id: "website-ux-improvement",
    slug: "website-ux-improvement",
    category: "work",
    title: "Website UX improvement pass",
    blurb: "Find the highest-impact UX issues, turn defects into clear reports, and prepare focused fixes.",
    overview:
      "Use this as a quick AI-assisted UX pass for a site that already exists and needs sharper decisions.",
    prerequisites: [
      "A live page, staging page, or screenshots",
      "The main user goal for the page",
      "Known support tickets, analytics notes, or complaints if available",
    ],
    timeLabel: "45 min quick pass",
    seoTitle: "Website UX Improvement Workflow For AI Prompts",
    seoDescription:
      "Run a quick AI-assisted workflow to inspect a website UX, capture issues, write bug reports, and plan focused improvements.",
    added: 5,
    steps: [
      {
        id: "ux-audit",
        title: "Run the UX audit",
        duration: "15 min quick pass",
        explanation:
          "Ask for concrete friction points tied to the user's goal, not a generic redesign critique.",
        inlinePrompts: [
          {
            id: "ux-audit-prompt",
            title: "Goal-based UX audit",
            body: `You are a practical UX reviewer.

Review this page against the user's main goal.

Inputs:
- Page URL or screenshots:
- Main user goal:
- Target audience:
- Known constraints:

Return:
- Top 7 friction points
- Why each issue blocks the goal
- Severity: high, medium, or low
- Evidence visible on the page
- Recommended fix in one sentence`,
          },
        ],
        deliverables: ["Ranked UX issue list", "Severity notes"],
        tips: [
          "Judge the page against one user goal.",
          "Reject vague advice like make it cleaner.",
        ],
      },
      {
        id: "defect-reports",
        title: "Write reports for real defects",
        duration: "8 min active prompt time",
        explanation:
          "Use the linked Prompt only for reproducible bugs or broken behavior, not preference notes.",
        linkedItems: [
          {
            type: "prompt",
            slug: "bug-repro-report",
            note: "Fits broken states, browser issues, and repeatable UI defects.",
          },
        ],
        deliverables: ["Bug reports for reproducible issues"],
        tips: [
          "Do not turn every UX opinion into a bug.",
          "Include exact steps and expected behavior.",
        ],
      },
      {
        id: "copy-fixes",
        title: "Improve the decision copy",
        duration: "10 min active prompt time",
        explanation:
          "Rewrite only the text that helps users decide, understand risk, or take the next action.",
        inlinePrompts: [
          {
            id: "decision-copy-prompt",
            title: "Decision copy rewrite",
            body: `You are a product copy editor.

Rewrite the decision-critical copy on this page.

Inputs:
- Current page copy:
- User goal:
- Top friction points:
- Brand voice constraints:

Return:
- Revised headline options
- Revised CTA labels
- Clarifying helper copy
- Copy to remove
- Why each change helps the user decide`,
          },
        ],
        deliverables: ["Headline options", "CTA copy", "Helper copy"],
        tips: [
          "Do not rewrite decorative text first.",
          "Keep labels literal where users need clarity.",
        ],
      },
      {
        id: "component-follow-up",
        title: "Scaffold focused UI fixes",
        duration: "8 min active prompt time",
        explanation:
          "Use the Template only when a fix requires a React component or UI state implementation.",
        linkedItems: [
          {
            type: "template",
            slug: "react-component-scaffold",
            note: "Fits implementation follow-up for a specific UI component.",
          },
        ],
        deliverables: ["Component implementation prompt", "State and accessibility checklist"],
        tips: [
          "Describe the exact component behavior.",
          "Include loading, empty, and error states when relevant.",
        ],
      },
      {
        id: "fix-plan",
        title: "Create the fix plan",
        duration: "4 min quick pass",
        explanation:
          "Sort the findings into a small plan that can actually ship.",
        inlinePrompts: [
          {
            id: "fix-plan-prompt",
            title: "UX fix plan",
            body: `Turn these UX findings into a shipping plan.

Inputs:
- Ranked UX issues:
- Bug reports:
- Copy changes:
- Engineering constraints:

Return:
- Must fix now
- Should fix next
- Leave for later
- Acceptance checks for each must-fix item
- Risks if we do nothing`,
          },
        ],
        deliverables: ["Prioritized fix plan", "Acceptance checks"],
        tips: [
          "Keep the must-fix list short.",
          "Tie every fix to the user goal.",
        ],
      },
    ],
  },
  {
    id: "landing-page-build-pass",
    slug: "landing-page-build-pass",
    category: "marketing",
    title: "Landing page build quick pass",
    blurb: "Move from offer clarity to page structure, draft sections, component prompts, and QA checks.",
    overview:
      "Use this when you need a fast first landing page pass with clear inputs and practical checks.",
    prerequisites: [
      "Product or offer description",
      "Target audience",
      "Primary conversion action",
      "Any brand or technical constraints",
    ],
    timeLabel: "45 min quick pass",
    seoTitle: "Landing Page Workflow For AI Prompts",
    seoDescription:
      "Use this workflow to plan and draft a landing page with AI prompts for offer clarity, page sections, component scaffolding, and QA.",
    added: 4,
    steps: [
      {
        id: "offer-clarity",
        title: "Clarify the offer",
        duration: "8 min active prompt time",
        explanation:
          "Define the audience, promise, proof, and action before asking for page copy.",
        inlinePrompts: [
          {
            id: "offer-clarity-prompt",
            title: "Landing offer brief",
            body: `You are a conversion strategist.

Create a landing page offer brief.

Inputs:
- Product or service:
- Target audience:
- Pain or desire:
- Primary action:
- Proof points:
- Objections:

Return:
- One-line offer
- Target audience summary
- Main promise
- Proof points
- Objections to address
- CTA recommendation`,
          },
        ],
        deliverables: ["Offer brief", "CTA recommendation"],
        tips: [
          "Do this before section copy.",
          "Separate proof from claims.",
        ],
      },
      {
        id: "page-structure",
        title: "Plan the page structure",
        duration: "8 min active prompt time",
        explanation:
          "Create a section order that matches buyer questions instead of a generic landing page template.",
        inlinePrompts: [
          {
            id: "page-structure-prompt",
            title: "Landing section map",
            body: `Create a landing page section map from this offer brief.

Return:
- Section order
- Purpose of each section
- Key question each section answers
- Proof needed
- CTA placement
- Sections to avoid for this offer`,
          },
        ],
        deliverables: ["Section map", "Proof plan"],
        tips: [
          "Use fewer sections for a simple offer.",
          "Each section should answer a real buyer question.",
        ],
      },
      {
        id: "section-copy",
        title: "Draft section copy",
        duration: "14 min active prompt time",
        explanation:
          "Generate copy in sections so each part has a clear job.",
        inlinePrompts: [
          {
            id: "section-copy-prompt",
            title: "Landing section copy",
            body: `You are a landing page copywriter.

Draft copy for each section in this section map.

Inputs:
- Offer brief:
- Section map:
- Brand voice:

For each section return:
- Heading
- Supporting copy
- CTA if needed
- Proof or example to include
- Notes on what the section should not say`,
          },
        ],
        deliverables: ["Draft section copy", "CTA labels"],
        tips: [
          "Ask for section-level copy, not a whole page blob.",
          "Replace vague proof with specific examples.",
        ],
      },
      {
        id: "component-scaffold",
        title: "Scaffold implementation prompts",
        duration: "10 min active prompt time",
        explanation:
          "Use the Template when the landing page needs concrete React components.",
        linkedItems: [
          {
            type: "template",
            slug: "react-component-scaffold",
            note: "Fits reusable sections, cards, comparison blocks, and forms.",
          },
        ],
        deliverables: ["Component prompt", "Props and state notes"],
        tips: [
          "Keep one component per prompt.",
          "Name the responsive behavior explicitly.",
        ],
      },
      {
        id: "qa-pass",
        title: "Run a QA pass",
        duration: "5 min quick pass",
        explanation:
          "Check the draft for clarity, missing proof, mobile risks, and weak CTAs.",
        inlinePrompts: [
          {
            id: "landing-qa-prompt",
            title: "Landing page QA",
            body: `Review this landing page draft before build.

Check for:
- Unclear offer
- Weak or missing proof
- CTA confusion
- Unsupported claims
- Mobile reading issues
- Missing objections

Return:
- Must-fix list
- Nice-to-have list
- Final acceptance checklist`,
          },
        ],
        deliverables: ["QA findings", "Acceptance checklist"],
        tips: [
          "Run this before visual polish.",
          "Fix clarity before animation or decoration.",
        ],
      },
    ],
  },
  {
    id: "prd-from-idea",
    slug: "prd-from-idea",
    category: "work",
    title: "PRD from idea",
    blurb: "Turn a rough product idea into a problem statement, requirements, risks, and handoff notes.",
    overview:
      "Use this when the idea is too early for specs but ready for structured product thinking.",
    prerequisites: [
      "Rough feature or product idea",
      "Target user or customer",
      "Business or user goal",
      "Known constraints",
    ],
    timeLabel: "40 min active prompt time",
    seoTitle: "PRD Workflow For AI Prompts",
    seoDescription:
      "Turn a rough product idea into an AI-assisted PRD with problem framing, requirements, risks, and handoff notes.",
    added: 3,
    steps: [
      {
        id: "problem-frame",
        title: "Frame the problem",
        duration: "8 min active prompt time",
        explanation:
          "Separate the user problem from the proposed solution before the PRD takes shape.",
        inlinePrompts: [
          {
            id: "problem-frame-prompt",
            title: "Problem framing",
            body: `You are a senior product manager.

Frame this product idea as a problem statement.

Inputs:
- Idea:
- Target user:
- User pain:
- Business goal:
- Constraints:

Return:
- Problem statement
- Target user
- Current workaround
- Desired outcome
- Why now
- Assumptions to validate`,
          },
        ],
        deliverables: ["Problem statement", "Assumption list"],
        tips: [
          "Do not let the solution define the problem.",
          "Call out assumptions early.",
        ],
      },
      {
        id: "user-scenarios",
        title: "Write user scenarios",
        duration: "8 min active prompt time",
        explanation:
          "Define the main flows before listing requirements.",
        inlinePrompts: [
          {
            id: "user-scenarios-prompt",
            title: "User scenarios",
            body: `Create user scenarios for this product idea.

Inputs:
- Problem statement:
- Target user:
- Desired outcome:

Return:
- 3 primary user scenarios
- Trigger for each scenario
- User goal
- Happy path
- Failure or edge case
- What success looks like`,
          },
        ],
        deliverables: ["Primary scenarios", "Edge cases"],
        tips: [
          "Use scenarios to keep requirements grounded.",
          "Include at least one failure case.",
        ],
      },
      {
        id: "requirements",
        title: "Draft requirements",
        duration: "10 min active prompt time",
        explanation:
          "Convert scenarios into clear requirements and non-goals.",
        inlinePrompts: [
          {
            id: "requirements-prompt",
            title: "PRD requirements",
            body: `Turn these scenarios into PRD requirements.

Return:
- Functional requirements
- Non-functional requirements
- Non-goals
- Open questions
- Acceptance criteria

Rules:
- Keep requirements testable
- Avoid implementation details unless they are true constraints`,
          },
        ],
        deliverables: ["Requirements", "Acceptance criteria", "Non-goals"],
        tips: [
          "Make each requirement testable.",
          "Write non-goals to protect scope.",
        ],
      },
      {
        id: "risks",
        title: "Find risks and tradeoffs",
        duration: "8 min active prompt time",
        explanation:
          "Stress-test the PRD before it reaches design or engineering.",
        inlinePrompts: [
          {
            id: "prd-risks-prompt",
            title: "PRD risk review",
            body: `Review this PRD draft for risks.

Return:
- Product risks
- UX risks
- Engineering risks
- Measurement risks
- Decisions that need owner input
- Suggested scope cuts if timeline is tight`,
          },
        ],
        deliverables: ["Risk list", "Decision list", "Scope cuts"],
        tips: [
          "Ask for tradeoffs, not only improvements.",
          "Use this before estimating effort.",
        ],
      },
      {
        id: "handoff",
        title: "Prepare the handoff",
        duration: "6 min quick pass",
        explanation:
          "Package the PRD into a short handoff note that people will read.",
        inlinePrompts: [
          {
            id: "prd-handoff-prompt",
            title: "PRD handoff note",
            body: `Create a concise handoff note from this PRD.

Return:
- Summary
- User problem
- Proposed solution
- Requirements
- Key risks
- Open questions
- Next meeting agenda`,
          },
        ],
        deliverables: ["Handoff note", "Meeting agenda"],
        tips: [
          "Keep the handoff shorter than the PRD.",
          "Put open questions near the top.",
        ],
      },
    ],
  },
  {
    id: "research-synthesis-brief",
    slug: "research-synthesis-brief",
    category: "education",
    title: "Research synthesis brief",
    blurb: "Turn notes and sources into themes, contradictions, insights, and a concise brief.",
    overview:
      "Use this when you have source material and need a structured synthesis instead of a summary pile.",
    prerequisites: [
      "Research notes, interview notes, articles, or excerpts",
      "The research question",
      "Audience for the final brief",
    ],
    timeLabel: "45 min active prompt time",
    seoTitle: "Research Synthesis Workflow For AI Prompts",
    seoDescription:
      "Use this AI prompt workflow to synthesize research notes into themes, contradictions, insights, and a concise brief.",
    added: 2,
    steps: [
      {
        id: "source-inventory",
        title: "Inventory the source material",
        duration: "8 min active prompt time",
        explanation:
          "Create a source map so the synthesis does not treat every note as equally strong.",
        inlinePrompts: [
          {
            id: "source-inventory-prompt",
            title: "Source inventory",
            body: `You are a research assistant.

Create a source inventory from these notes.

Inputs:
- Research question:
- Source notes:

Return:
- Source list
- Source type
- Main claim or observation
- Evidence strength
- Caveats or bias
- Relevance to the research question`,
          },
        ],
        deliverables: ["Source inventory", "Evidence strength notes"],
        tips: [
          "Track weak evidence instead of deleting it.",
          "Keep claims attached to sources.",
        ],
      },
      {
        id: "theme-clustering",
        title: "Cluster themes",
        duration: "10 min active prompt time",
        explanation:
          "Group the notes into themes while preserving outliers.",
        inlinePrompts: [
          {
            id: "theme-clustering-prompt",
            title: "Theme clustering",
            body: `Cluster these research notes into themes.

Return:
- 4 to 7 major themes
- Notes or sources supporting each theme
- Outliers that do not fit
- Repeated patterns
- Questions raised by each theme`,
          },
        ],
        deliverables: ["Theme list", "Outliers", "Open questions"],
        tips: [
          "Ask for outliers explicitly.",
          "Do not turn every note into its own theme.",
        ],
      },
      {
        id: "contradictions",
        title: "Find contradictions",
        duration: "8 min active prompt time",
        explanation:
          "Surface conflicts and uncertainty before writing recommendations.",
        inlinePrompts: [
          {
            id: "contradictions-prompt",
            title: "Contradiction review",
            body: `Review these themes for contradictions and uncertainty.

Return:
- Claims that conflict
- Sources behind each side
- Possible reasons for the conflict
- What needs more research
- What can still be concluded safely`,
          },
        ],
        deliverables: ["Contradiction list", "Uncertainty notes"],
        tips: [
          "Do not force false agreement.",
          "Mark conclusions that need more evidence.",
        ],
      },
      {
        id: "insight-brief",
        title: "Draft the synthesis brief",
        duration: "14 min active prompt time",
        explanation:
          "Turn the themes into a concise brief with evidence and implications.",
        inlinePrompts: [
          {
            id: "insight-brief-prompt",
            title: "Research synthesis brief",
            body: `Write a concise research synthesis brief.

Inputs:
- Research question:
- Themes:
- Contradictions:
- Audience:

Return:
- Executive summary
- Key insights
- Evidence behind each insight
- Contradictions or limits
- Implications
- Recommended next steps`,
          },
        ],
        deliverables: ["Synthesis brief", "Next steps"],
        tips: [
          "Separate insight from implication.",
          "Name the limits of the evidence.",
        ],
      },
      {
        id: "review-questions",
        title: "Prepare review questions",
        duration: "5 min quick pass",
        explanation:
          "Create questions for a reviewer so the brief gets sharper instead of longer.",
        inlinePrompts: [
          {
            id: "review-questions-prompt",
            title: "Brief review questions",
            body: `Create review questions for this research brief.

Return:
- Questions to test evidence quality
- Questions to test interpretation
- Questions to test missing stakeholders
- Questions to test practical next steps`,
          },
        ],
        deliverables: ["Reviewer question list"],
        tips: [
          "Ask questions that find weak reasoning.",
          "Use the answers to revise, not expand endlessly.",
        ],
      },
    ],
  },
  {
    id: "healthier-week-plan",
    slug: "healthier-week-plan",
    category: "life",
    title: "Healthier week plan",
    blurb: "Plan meals, workouts, recovery, and review prompts for a realistic week.",
    overview:
      "Use this when you want a practical week plan that covers food and movement without over-optimizing.",
    prerequisites: [
      "Schedule constraints for the week",
      "Food preferences or limits",
      "Fitness goal and available equipment",
    ],
    timeLabel: "35 min active prompt time",
    seoTitle: "Healthier Week Workflow For AI Prompts",
    seoDescription:
      "Plan a realistic week with AI prompts for meals, workouts, recovery, and weekly review.",
    added: 1,
    steps: [
      {
        id: "week-constraints",
        title: "Set weekly constraints",
        duration: "6 min active prompt time",
        explanation:
          "Capture the real limits first so the plan fits the week you actually have.",
        inlinePrompts: [
          {
            id: "week-constraints-prompt",
            title: "Weekly constraints",
            body: `Help me define realistic constraints for a healthier week.

Inputs:
- Work and family schedule:
- Energy level:
- Food preferences:
- Fitness goal:
- Equipment:
- Non-negotiable limits:

Return:
- Weekly constraints
- Best meal prep windows
- Best workout windows
- Risk points
- Simple default choices`,
          },
        ],
        deliverables: ["Weekly constraints", "Prep windows", "Risk points"],
        tips: [
          "Plan around the hard days first.",
          "Keep defaults simple enough to repeat.",
        ],
      },
      {
        id: "meal-plan",
        title: "Plan meals",
        duration: "10 min active prompt time",
        explanation:
          "Use the meal planner Template when you need a custom plan and grocery list.",
        linkedItems: [
          {
            type: "template",
            slug: "weekly-meal-planner",
            note: "Fits a realistic weekly meal plan with constraints.",
          },
        ],
        deliverables: ["Meal plan", "Grocery list", "Prep notes"],
        tips: [
          "Do not overfill the week with new recipes.",
          "Ask for leftovers if your schedule is tight.",
        ],
      },
      {
        id: "workout-plan",
        title: "Plan workouts",
        duration: "10 min active prompt time",
        explanation:
          "Use the workout Template when the week needs structured training sessions.",
        linkedItems: [
          {
            type: "template",
            slug: "workout-plan",
            note: "Fits a custom training plan by goal, schedule, and equipment.",
          },
        ],
        deliverables: ["Workout schedule", "Progression notes"],
        tips: [
          "Choose consistency over intensity.",
          "Include a fallback workout for busy days.",
        ],
      },
      {
        id: "recovery-and-snacks",
        title: "Add recovery and fallback options",
        duration: "5 min quick pass",
        explanation:
          "Add small supports so the plan survives imperfect days.",
        inlinePrompts: [
          {
            id: "recovery-snacks-prompt",
            title: "Recovery and fallback plan",
            body: `Add recovery and fallback options to this weekly health plan.

Inputs:
- Meal plan:
- Workout plan:
- Busy days:
- Common failure points:

Return:
- Recovery reminders
- 5 quick meal fallbacks
- 3 short movement options
- Sleep or rest guardrails
- What to do if I miss a day`,
          },
        ],
        deliverables: ["Fallback meals", "Short movement options", "Recovery guardrails"],
        tips: [
          "Fallbacks are part of the plan.",
          "Avoid guilt-based language.",
        ],
      },
      {
        id: "weekly-review",
        title: "Review and adjust",
        duration: "4 min quick pass",
        explanation:
          "End with a simple review that adjusts the next week instead of judging the last one.",
        inlinePrompts: [
          {
            id: "weekly-review-prompt",
            title: "Healthier week review",
            body: `Create a short weekly review for this health plan.

Return:
- What worked
- What was too hard
- What to repeat
- What to simplify
- One adjustment for next week`,
          },
        ],
        deliverables: ["Weekly review questions", "Next-week adjustment"],
        tips: [
          "Review behavior, not identity.",
          "Change one thing at a time.",
        ],
      },
    ],
  },
];

export function getWorkflow(slug: string): Workflow | undefined {
  return WORKFLOWS.find((workflow) => workflow.slug === slug);
}

export function workflowStepCount(workflow: Workflow): number {
  return workflow.steps.length;
}

export function workflowCountFor(categoryId: string | "all"): number {
  return categoryId === "all"
    ? WORKFLOWS.length
    : WORKFLOWS.filter((workflow) => workflow.category === categoryId).length;
}

export function workflowCategories(): Category[] {
  return CATEGORIES.filter((category) => workflowCountFor(category.id) > 0);
}

export function workflowCategoryLabel(categoryId: string): string {
  return categoryLabel(categoryId);
}

export function workflowLinkedPromptCount(workflow: Workflow): number {
  return workflow.steps.reduce(
    (count, step) =>
      count + (step.linkedItems ?? []).filter((item) => item.type === "prompt").length,
    0
  );
}

export function workflowTemplateCount(workflow: Workflow): number {
  return workflow.steps.reduce(
    (count, step) =>
      count + (step.linkedItems ?? []).filter((item) => item.type === "template").length,
    0
  );
}

export function workflowInlinePromptCount(workflow: Workflow): number {
  return workflow.steps.reduce((count, step) => count + (step.inlinePrompts?.length ?? 0), 0);
}

export function workflowToolMix(workflow: Workflow): WorkflowToolMix {
  const templates = workflowTemplateCount(workflow);
  const linkedPrompts = workflowLinkedPromptCount(workflow);
  const inlinePrompts = workflowInlinePromptCount(workflow);
  const parts = [
    templates ? `${templates} ${templates === 1 ? "Template" : "Templates"}` : "",
    linkedPrompts
      ? `${linkedPrompts} linked ${linkedPrompts === 1 ? "Prompt" : "Prompts"}`
      : "",
    inlinePrompts
      ? `${inlinePrompts} inline ${inlinePrompts === 1 ? "prompt" : "prompts"}`
      : "",
  ].filter(Boolean);

  return {
    templates,
    linkedPrompts,
    inlinePrompts,
    label: parts.join(" + "),
  };
}

export function resolveWorkflowLinkedItem(
  item: WorkflowLinkedItem
): WorkflowLinkedItemDetail | null {
  if (item.type === "template") {
    const template = getTemplate(item.slug);
    if (!template) return null;
    return {
      ...item,
      title: displayTitle(template),
      href: `/templates/${template.slug}`,
      label: "Template",
    };
  }

  const prompt = getExamplePrompt(item.slug);
  if (!prompt) return null;
  return {
    ...item,
    title: prompt.title,
    href: `/prompts/${prompt.slug}`,
    label: "Prompt",
  };
}

export function isWorkflowLinkedItemValid(item: WorkflowLinkedItem): boolean {
  return Boolean(resolveWorkflowLinkedItem(item));
}

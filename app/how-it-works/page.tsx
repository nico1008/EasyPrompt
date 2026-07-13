import type { Metadata } from "next";
import Link from "next/link";
import "../content.css";
import { Eyebrow } from "@/components/Eyebrow";
import { Icon, type IconName } from "@/components/Icon";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Choose a reusable Template, a ready-to-use Prompt, or a guided Workflow, then move from a real task to useful AI output.",
  alternates: { canonical: "/how-it-works" },
};

const STARTING_POINTS: {
  icon: IconName;
  title: string;
  body: string;
  href: string;
  action: string;
}[] = [
  {
    icon: "list",
    title: "Template",
    body: "Use a Template when the task repeats but the details change. Fill a short form and get a Prompt tailored to this situation.",
    href: "/templates",
    action: "Browse Templates",
  },
  {
    icon: "code",
    title: "Prompt",
    body: "Use a Prompt when the instruction is already finished. Copy it as-is, open it in your AI tool, or customize a copy.",
    href: "/prompts",
    action: "Browse Prompts",
  },
  {
    icon: "book",
    title: "Workflow",
    body: "Use a Workflow when one Prompt is not enough. Follow an ordered playbook that connects the right Templates, Prompts, and inline instructions.",
    href: "/workflows",
    action: "Browse Workflows",
  },
];

const STEPS = [
  {
    n: 1,
    title: "Start from the size of the task",
    body: "Choose a Template for repeat work, a Prompt for immediate use, or a Workflow for a larger outcome.",
  },
  {
    n: 2,
    title: "Use the content where it helps",
    body: "Fill only what matters, copy finished text, or work through the next Workflow step. Blank Template fields are left out cleanly.",
  },
  {
    n: 3,
    title: "Copy, continue, or come back later",
    body: "Open the result in the AI tool you already use. Favorite useful public content, save your own Prompts, or return to a linked Workflow step.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="content-page">
      <div className="content-wrap">
        <div className="page-hero">
          <Eyebrow>How it works</Eyebrow>
          <h1>
            Choose the right starting point<span className="accent">.</span>
          </h1>
          <p>
            Templates, Prompts, and Workflows solve different sizes of task. Pick the
            smallest one that gets the job done.
          </p>
        </div>

        <div className="how-steps how-starting-points">
          {STARTING_POINTS.map((point) => (
            <div key={point.title} className="panel how-step how-kind">
              <div className="num" aria-hidden="true">
                <Icon name={point.icon} size={17} />
              </div>
              <div>
                <h2>{point.title}</h2>
                <p>{point.body}</p>
                <Link href={point.href}>{point.action} →</Link>
              </div>
            </div>
          ))}
        </div>

        <div className="prose">
          <h2>One simple flow</h2>
        </div>
        <div className="how-steps">
          {STEPS.map((step) => (
            <div key={step.n} className="panel how-step">
              <div className="num">{step.n}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="center-cta">
          <Link className="btn btn-primary btn-lg" href="/templates">
            Find a starting point →
          </Link>
        </div>
      </div>
    </main>
  );
}

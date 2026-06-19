import type { Metadata } from "next";
import Link from "next/link";
import "../content.css";
import { Eyebrow } from "@/components/Eyebrow";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "EasyPrompt turns prompt-writing into filling out a short form. Pick a template, answer a few plain questions, and copy a perfectly crafted prompt — no prompt engineering required.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS = [
  {
    n: 1,
    title: "Pick a template",
    body: "Browse the template library — meal plans, cover letters, lesson plans, code scaffolds. Each one was designed by someone who actually knows what makes a prompt work, so the hard part is already done.",
  },
  {
    n: 2,
    title: "Fill out the form",
    body: "Answer a few plain-English questions. Type what you know, skip what you don't — blank answers are quietly left out, so you'll never paste a prompt full of empty [BRACKETS].",
  },
  {
    n: 3,
    title: "Copy and paste",
    body: "One click assembles everything into a clean, structured prompt and copies it to your clipboard. Open ChatGPT, Claude, or Gemini, paste, and get a great result on the first try.",
  },
];

const WHY = [
  {
    h: "No prompt engineering",
    p: "You don't need to know about roles, constraints, or few-shot examples. The template encodes all of that — you just answer questions.",
  },
  {
    h: "Smart exclusion",
    p: "Leave a field blank and the matching instruction disappears entirely. No placeholder brackets, no half-finished sentences.",
  },
  {
    h: "Works with any AI",
    p: "The output is plain text. It works identically in ChatGPT, Claude, Gemini, or whatever model you prefer — today and next year.",
  },
  {
    h: "Nothing to install",
    p: "The prompt is built right in your browser and copied to your clipboard — no extension needed. Create a free account whenever you want to save a prompt or build your own template.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="content-page">
      <div className="content-wrap">
        <div className="page-hero">
          <Eyebrow>How it works</Eyebrow>
          <h1>
            Three steps. That&apos;s the whole thing<span className="accent">.</span>
          </h1>
          <p>
            EasyPrompt is a form, not a blank page. You answer a few questions and we
            do the prompt engineering behind the scenes.
          </p>
        </div>

        <div className="how-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="panel how-step">
              <div className="num">{s.n}</div>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="prose">
          <h2>Why it works</h2>
        </div>
        <div className="how-steps">
          {WHY.map((w) => (
            <div key={w.h} className="panel how-step">
              <div className="num">·</div>
              <div>
                <h3>{w.h}</h3>
                <p>{w.p}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="center-cta">
          <Link className="btn btn-primary btn-lg" href="/templates">
            Try a template →
          </Link>
        </div>
      </div>
    </main>
  );
}

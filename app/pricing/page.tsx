import type { Metadata } from "next";
import Link from "next/link";
import "../content.css";
import { Eyebrow } from "@/components/Eyebrow";
import { CrosshairCard } from "@/components/CrosshairCard";
import { Icon } from "@/components/Icon";
import { UnlockForm } from "@/components/UnlockForm";
import { config } from "@/config";

export const metadata: Metadata = {
  title: "Pricing — free core, optional Pro",
  description:
    "The EasyPrompt builder is free forever — no limits. A free account lets you save prompts and build your own templates. Optional Pro Boosters unlock with an access code bought on Telegram or in crypto. No card handling on-site.",
  alternates: { canonical: "/pricing" },
};

const FREE = [
  "Every prompt template",
  "Unlimited prompts, no limits",
  "Save prompts & build your own templates with a free account",
  "Works with ChatGPT, Claude & Gemini",
  "Download & share your prompts",
];

const PRO = [
  "Everything in Free",
  "Pro Boosters: expert role priming & quality self-check",
  "A strict output format tuned per template",
  "Per-model tuning for ChatGPT, Claude & Gemini",
  "Unlocks with a code — bought off-site, no card on-site",
];

const FAQ = [
  {
    q: "Is the builder really free?",
    a: "Yes. Every template, no limits. The core builder runs in your browser, so it costs nothing — and a free account lets you save your prompts and build your own templates.",
  },
  {
    q: "What does Pro add?",
    a: "Pro Boosters — expert enhancement blocks appended to the prompt the free builder already makes. The free prompt works great; Pro makes it sharper. It's convenience, never a gate on core features.",
  },
  {
    q: "How do I pay? Do you handle my card?",
    a: "No. Payment happens off-site — in Telegram (card or Telegram Stars) or in crypto. You're handed an access code; paste it here to unlock. This site never processes payments and stores no payment data.",
  },
  {
    q: "Do you train on my inputs?",
    a: "No, we don't train on anything. Building a prompt happens in your browser; your answers are only sent to us if you choose to save a prompt to your account. Unlocking Pro only sends the access code to verify its signature.",
  },
];

export default function PricingPage() {
  return (
    <main className="content-page">
      <div className="content-wrap">
        <div className="page-hero">
          <Eyebrow>Pricing</Eyebrow>
          <h1>
            Free core. Optional Pro<span className="accent">.</span>
          </h1>
          <p>
            The builder is free forever — no limits, runs in your browser. A free
            account lets you save prompts and build your own templates. Pro Boosters
            are a paid convenience, unlocked with a code you buy off-site.
          </p>
        </div>

        <div className="price-grid">
          <CrosshairCard className="price-card feature">
            <span className="plan">Free</span>
            <div className="amount">
              $0<span className="per"> / forever</span>
            </div>
            <p className="tagline">Everything you need to build great prompts.</p>
            <ul>
              {FREE.map((f) => (
                <li key={f}>
                  <Icon name="check" size={16} strokeWidth={2.4} />
                  {f}
                </li>
              ))}
            </ul>
            <Link className="btn btn-primary btn-lg" href="/templates">
              Get started →
            </Link>
          </CrosshairCard>

          <CrosshairCard className="price-card">
            <span className="plan">Pro</span>
            <div className="amount">
              {config.pricing.lifetime.split(" ")[0]}
              <span className="per"> · one-time</span>
            </div>
            <p className="tagline">Pro Boosters, unlocked with an access code.</p>
            <ul>
              {PRO.map((f) => (
                <li key={f}>
                  <Icon name="check" size={16} strokeWidth={2.4} />
                  {f}
                </li>
              ))}
            </ul>
            <a
              className="btn btn-ink btn-lg"
              href={config.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get a code on Telegram →
            </a>
            <div className="price-unlock">
              <UnlockForm />
            </div>
          </CrosshairCard>
        </div>

        <div className="prose">
          <h2>Questions</h2>
        </div>
        <div className="faq">
          {FAQ.map((f) => (
            <CrosshairCard key={f.q} className="faq-item">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </CrosshairCard>
          ))}
        </div>
      </div>
    </main>
  );
}

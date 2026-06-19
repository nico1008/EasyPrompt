import type { Metadata } from "next";
import Link from "next/link";
import "@/app/my/my.css";
import { Eyebrow } from "@/components/Eyebrow";
import { CrosshairCard } from "@/components/CrosshairCard";

/* The Prompts catalog. A "Prompt" is a finished, ready-to-paste instruction (the
 * counterpart to a reusable Template). Public discovery of community-published
 * prompts is a follow-up (needs a listing RPC); for now this orients users to the
 * ways a Prompt comes to exist — generated from a Template, or built. */
export const metadata: Metadata = {
  title: "Prompts — ready-to-use",
  description:
    "Ready-to-use AI prompts for ChatGPT, Claude, and Gemini. Generate one from a template, then save, share, and publish it.",
  alternates: { canonical: "/prompts" },
};

export default function PromptsCatalogPage() {
  return (
    <main className="my-page">
      <div className="my-wrap" style={{ maxWidth: 760 }}>
        <div className="my-head">
          <div>
            <Eyebrow>Prompts</Eyebrow>
            <h1>Ready-to-use prompts</h1>
          </div>
        </div>

        <CrosshairCard className="panel my-empty">
          <p>
            A <strong>prompt</strong> is a finished, ready-to-paste instruction. Generate one by
            filling in a <strong>template</strong>, then save it, share a link, or publish it to your
            library.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Link className="btn btn-primary btn-sm" href="/templates">
              Browse templates →
            </Link>
            <Link className="btn btn-ghost btn-sm" href="/build">
              Open the builder
            </Link>
          </div>
        </CrosshairCard>
      </div>
    </main>
  );
}

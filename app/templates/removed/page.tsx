import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/Eyebrow";
import "../../content.css";

export const metadata: Metadata = {
  title: "Template unavailable",
  robots: { index: false, follow: false },
};

export default function RemovedTemplatePage() {
  return (
    <main className="content-page">
      <section className="content-wrap">
        <div className="page-hero">
          <Eyebrow>Template unavailable</Eyebrow>
          <h1>This Template was removed.</h1>
          <p>Saved Prompts created from it still work, but the source Template can no longer be opened.</p>
          <Link className="btn btn-primary" href="/templates">Browse Templates</Link>
        </div>
      </section>
    </main>
  );
}

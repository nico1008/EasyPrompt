import type { Metadata } from "next";
import "../content.css";
import { Eyebrow } from "@/components/Eyebrow";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms of service for using EasyPrompt.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="content-page">
      <div className="content-wrap">
        <div className="page-hero" style={{ textAlign: "left" }}>
          <Eyebrow>Legal</Eyebrow>
          <h1 style={{ marginTop: 12 }}>Terms of service</h1>
        </div>

        <div className="prose">
          <p className="meta">Last updated June 12, 2026</p>

          <p>
            By using EasyPrompt you agree to these terms. They&apos;re intentionally
            short and plain.
          </p>

          <h2>Using EasyPrompt</h2>
          <p>
            EasyPrompt helps you assemble text prompts from templates. The core
            builder is free; an optional paid tier (&ldquo;Pro Boosters&rdquo;) adds
            enhancement blocks to the prompts you build. You may use EasyPrompt for
            personal or commercial purposes. You are responsible for what you do with
            the prompts you generate and the outputs you get from third-party AI
            tools.
          </p>

          <h2>Pro Boosters &amp; access codes</h2>
          <p>
            Pro Boosters unlock with an access code. Payment happens off-site — via
            our Telegram storefront or a cryptocurrency payment processor — and this
            site never processes payments or stores payment details. An access code
            is a license, not an account: it unlocks the device where you enter it,
            and you may use your code on the devices you personally use. Don&apos;t
            publish, resell, or share codes; we may invalidate codes that are abused.
          </p>
          <p>
            <strong>Plans.</strong> A lifetime code does not expire. A pass or
            subscription code expires on the date encoded in it, after which Pro
            features lock again until you enter a new code. The free builder is never
            affected by an expired code.
          </p>
          <p>
            <strong>Refunds.</strong> If a valid code fails to unlock Pro and we
            can&apos;t fix it within a reasonable time, contact us within 14 days of
            purchase for a refund through the channel you bought from. Refunds for
            change-of-mind are not guaranteed once a code has been used.
          </p>

          <h2>The prompts you create</h2>
          <p>
            The prompts you build and the answers you provide are yours. We claim no
            ownership over them. The templates themselves remain the property of
            EasyPrompt and its contributors and are provided for your use within the
            product.
          </p>

          <h2>Acceptable use</h2>
          <ul>
            <li>Don&apos;t use EasyPrompt to create content that is illegal or harmful.</li>
            <li>Don&apos;t attempt to disrupt, scrape at scale, or abuse the service.</li>
            <li>Don&apos;t misrepresent EasyPrompt&apos;s output as professional advice it isn&apos;t.</li>
          </ul>

          <h2>No warranty</h2>
          <p>
            EasyPrompt is provided &ldquo;as is&rdquo; without warranties of any kind.
            We don&apos;t guarantee that a generated prompt will produce any particular
            result from an AI model. Always review output before relying on it.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, EasyPrompt is not liable for any
            indirect or consequential damages arising from your use of the service or
            of any third-party AI tool you paste a prompt into.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these terms from time to time. Continued use after a change
            means you accept the updated terms.
          </p>

          <h2>Contact</h2>
          <p>
            Questions? Email{" "}
            <a href="mailto:hello@easyprompt.app">hello@easyprompt.app</a>.
          </p>
        </div>
      </div>
    </main>
  );
}

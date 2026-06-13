import type { Metadata } from "next";
import "../content.css";
import { Eyebrow } from "@/components/Eyebrow";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "EasyPrompt's privacy policy — what we collect when you use the builder, and what we store when you create an account.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="content-page">
      <div className="content-wrap">
        <div className="page-hero" style={{ textAlign: "left" }}>
          <Eyebrow>Legal</Eyebrow>
          <h1 style={{ marginTop: 12 }}>Privacy policy</h1>
        </div>

        <div className="prose">
          <p className="meta">Last updated June 12, 2026</p>

          <p>
            EasyPrompt is built to need as little of your data as possible. This
            policy explains what we do — and mostly don&apos;t — collect.
          </p>

          <h2>Using EasyPrompt without an account</h2>
          <p>
            You can use the entire prompt builder without signing up. The answers you
            type into a template are assembled in your browser and copied to your
            clipboard — when you&apos;re just building and copying, they are not sent
            to our servers.
          </p>

          <h2>When you create an account</h2>
          <p>
            An account lets you save prompts and build your own templates across
            devices. To provide that, we store some data. We use{" "}
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
              Supabase
            </a>{" "}
            as our database and authentication provider; your account data is stored
            and processed there on our behalf.
          </p>

          <h2>What we store</h2>
          <ul>
            <li>
              <strong>Your email address:</strong> to identify your account, verify
              it, and let you reset your password.
            </li>
            <li>
              <strong>Your password:</strong> never stored in plain text — it is
              hashed by our authentication provider using industry-standard bcrypt.
            </li>
            <li>
              <strong>Your templates &amp; saved prompts:</strong> the templates you
              build and the prompts you save are stored in our database so you can
              get to them from any device. You can edit or delete them at any time,
              and deleting your account removes all of them.
            </li>
            <li>
              <strong>Usage analytics:</strong> None today. If we ever add analytics
              it will be aggregate and non-identifying, will never include the text
              you enter, and we&apos;ll update this policy first.
            </li>
            <li>
              <strong>Pro unlock:</strong> If you enter a Pro access code, the code
              itself is sent to our server once to verify its signature. The unlocked
              state is then stored in your browser&apos;s local storage, on your device.
            </li>
          </ul>

          <h2>Cookies</h2>
          <p>
            EasyPrompt does not use advertising or cross-site tracking cookies. When
            you sign in we set secure, functional cookies to keep you logged in — that
            is the only thing they do.
          </p>

          <h2>Deleting your data</h2>
          <p>
            You can delete any template or saved prompt at any time. To remove
            everything, delete your account from Account settings — this permanently
            deletes your account and all templates and prompts you own.
          </p>

          <h2>Third-party AI tools</h2>
          <p>
            When you paste a prompt into ChatGPT, Claude, Gemini, or any other tool,
            that service&apos;s own privacy policy applies. We have no visibility into
            what you do once the prompt leaves your clipboard.
          </p>

          <h2>Children</h2>
          <p>
            EasyPrompt is not directed at children under 13 and we do not knowingly
            collect personal information from them.
          </p>

          <h2>Changes</h2>
          <p>
            If this policy changes, we&apos;ll update the date above. Material changes
            will be noted on this page.
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

import type { Metadata } from "next";
import "../content.css";
import { Eyebrow } from "@/components/Eyebrow";
import { SubmitForm } from "./SubmitForm";

export const metadata: Metadata = {
  title: "Submit a template",
  description:
    "Have an idea for a prompt template? Suggest it and we'll consider adding it to the EasyPrompt library.",
  alternates: { canonical: "/submit-template" },
};

export default function SubmitTemplatePage() {
  return (
    <main className="content-page">
      <div className="content-wrap">
        <div className="page-hero">
          <Eyebrow>Contribute</Eyebrow>
          <h1>
            Got a template idea<span className="accent">?</span>
          </h1>
          <p>
            The library grows from real needs. Tell us what you wish existed and
            we&apos;ll build the good ones.
          </p>
        </div>

        <SubmitForm />
      </div>
    </main>
  );
}

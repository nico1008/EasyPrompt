"use client";

import { useState } from "react";
import { CrosshairCard } from "@/components/CrosshairCard";

export function SubmitForm() {
  const [draftOpened, setDraftOpened] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Life & home");
  const [idea, setIdea] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = [
      `Template idea: ${title}`,
      `Category: ${category}`,
      `From: ${name} <${email}>`,
      "",
      "What it should do:",
      idea,
    ].join("\n");
    // No backend by design — hand off to the user's mail client.
    window.location.href = `mailto:templates@easyprompt.app?subject=${encodeURIComponent(
      `Template idea: ${title || "(untitled)"}`
    )}&body=${encodeURIComponent(body)}`;
    setDraftOpened(true);
  }

  return (
    <CrosshairCard as="form" className="submit-card" onSubmit={onSubmit}>
      <div className="row-2">
        <div className="field">
          <label htmlFor="sf-name">Your name</label>
          <input
            id="sf-name"
            name="name"
            className="input"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Jordan Lee"
          />
        </div>
        <div className="field">
          <label htmlFor="sf-email">Email</label>
          <input
            id="sf-email"
            name="email"
            className="input"
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="sf-title">
          Template title <span className="req">*</span>
        </label>
        <input
          id="sf-title"
          name="title"
          className="input"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Grant proposal outline"
        />
      </div>

      <div className="field">
        <label htmlFor="sf-cat">Best-fit category</label>
        <select
          id="sf-cat"
          name="category"
          className="select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {["Life & home", "Writing", "Education", "Work & business", "Marketing", "Creative", "Code"].map(
            (c) => (
              <option key={c}>{c}</option>
            )
          )}
        </select>
      </div>

      <div className="field">
        <label htmlFor="sf-idea">
          What should it do? <span className="req">*</span>
        </label>
        <textarea
          id="sf-idea"
          name="idea"
          className="textarea"
          required
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe the questions it should ask and the kind of prompt it should produce."
        />
      </div>

      <div className="actions">
        <button className="btn btn-primary" type="submit">
          Open email draft →
        </button>
        {draftOpened && (
          <span className="submit-note submit-note-inline" role="status">
            Your email draft is open. Review it, then send when ready.
          </span>
        )}
      </div>
      <p className="submit-note">
        This opens a pre-filled email in your mail app. We read every suggestion and
        fast-track the popular ones.
      </p>
    </CrosshairCard>
  );
}

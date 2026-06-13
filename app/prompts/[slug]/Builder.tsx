"use client";

import { Fragment, useMemo, useState, useCallback, useEffect, type KeyboardEvent } from "react";
import Link from "next/link";
import type { Template } from "@/data/types";
import { displayTitle, categoryLabel } from "@/data/templates";
import {
  buildPrompt,
  defaultAnswers,
  openInUrl,
  type Answers,
} from "@/lib/buildPrompt";
import { CrosshairCard } from "@/components/CrosshairCard";
import { Eyebrow } from "@/components/Eyebrow";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { UnlockForm } from "@/components/UnlockForm";
import { usePremium, fetchBoosters, type Booster } from "@/lib/premium/client";
import { SavePromptButton, type SaveSource } from "@/components/SavePromptButton";
import { config } from "@/config";

type RelatedLite = { slug: string; title: string; category: string; questions: number };

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function Builder({
  template,
  related,
  initialAnswers,
  source,
  savedPromptId,
  crumbs,
  backHref = "/prompts",
}: {
  template: Template;
  related: RelatedLite[];
  /** Pre-fill the form (e.g. reopening a saved prompt). Defaults to template defaults. */
  initialAnswers?: Answers;
  /** Where a "Save" writes to. Defaults to this catalog template. */
  source?: SaveSource;
  /** When set, the Save button re-saves this existing saved_prompts row. */
  savedPromptId?: string;
  /** Override the breadcrumb trail (user templates use "My prompts / Title"). */
  crumbs?: { href?: string; label: string }[];
  /** Back-link target for the form's "← Back" button. */
  backHref?: string;
}) {
  const [answers, setAnswers] = useState<Answers>(
    () => initialAnswers ?? defaultAnswers(template)
  );
  const saveSource: SaveSource = source ?? { kind: "catalog", slug: template.slug };
  const trail = crumbs ?? [
    { href: "/prompts", label: "Prompts" },
    { href: `/prompts?category=${template.category}`, label: categoryLabel(template.category) },
    { label: displayTitle(template) },
  ];
  const [step, setStep] = useState<"form" | "payoff">("form");
  const [toast, setToast] = useState(false);
  const [copiedAgain, setCopiedAgain] = useState(false);

  const built = useMemo(() => buildPrompt(template, answers), [template, answers]);

  /* ---- Pro Boosters (premium): server-held enhancement blocks appended to
     the built prompt. Free prompt is `built.text`; pro adds `boosterText`. ---- */
  const { status: premium } = usePremium();
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (premium !== "unlocked") {
      setBoosters([]);
      setPicked({});
      return;
    }
    let cancelled = false;
    void fetchBoosters(template.id).then((bs) => {
      if (cancelled || !bs) return;
      setBoosters(bs);
      setPicked(Object.fromEntries(bs.map((b) => [b.id, true]))); // enhancements default on
    });
    return () => {
      cancelled = true;
    };
  }, [premium, template.id]);

  const boosterText = useMemo(
    () => boosters.filter((b) => picked[b.id]).map((b) => b.text).join(""),
    [boosters, picked]
  );
  const finalText = built.text + boosterText;
  const finalTokens = Math.max(1, Math.ceil(finalText.length / 4));
  const finalKb = (new TextEncoder().encode(finalText).length / 1024).toFixed(1);
  const displaySegments = boosterText
    ? [...built.segments, { text: boosterText, kind: "acc" as const }]
    : built.segments;

  const toggleBooster = useCallback((id: string) => {
    setPicked((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  const setField = useCallback((id: string, value: string) => {
    setAnswers((a) => ({ ...a, fields: { ...a.fields, [id]: value } }));
  }, []);
  const toggleCheck = useCallback((id: string) => {
    setAnswers((a) => ({ ...a, checks: { ...a.checks, [id]: !a.checks[id] } }));
  }, []);

  const flashToast = useCallback(() => {
    setToast(true);
    window.setTimeout(() => setToast(false), 3000);
  }, []);

  const submit = useCallback(async () => {
    await copyText(finalText);
    setStep("payoff");
    flashToast();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [finalText, flashToast]);

  const copyAgain = useCallback(async () => {
    const ok = await copyText(finalText);
    if (ok) {
      setCopiedAgain(true);
      flashToast();
      window.setTimeout(() => setCopiedAgain(false), 2200);
    }
  }, [finalText, flashToast]);

  const download = useCallback(() => {
    const blob = new Blob([finalText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [finalText, template.slug]);

  const share = useCallback(async () => {
    const data = { title: `${displayTitle(template)} prompt`, text: finalText };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* user cancelled or unsupported — fall back */
      }
    }
    const ok = await copyText(finalText);
    if (ok) flashToast();
  }, [finalText, template, flashToast]);

  // Esc steps back. Enter no longer auto-submits: on a multi-field, mostly
  // optional form it was too easy to finalize by reflex while mid-edit. The
  // explicit "Get my prompt" button is the one way to advance.
  const onFormKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (typeof window !== "undefined" && window.history.length > 1) {
        window.history.back();
      }
    }
  }, []);

  /* ---- pair consecutive pill fields into a .field-row (mirrors the mockup) ---- */
  const rows: Template["fields"][] = [];
  for (let i = 0; i < template.fields.length; i++) {
    const f = template.fields[i];
    const next = template.fields[i + 1];
    if (f.type === "pills" && next && next.type === "pills") {
      rows.push([f, next]);
      i++;
    } else {
      rows.push([f]);
    }
  }

  if (step === "payoff") {
    return (
      <main className="builder-page">
        <div className="payoff">
          <Toast show={toast} message="Prompt copied to clipboard" />

          <div className="receipt-head">
            <div className="check-disc">
              <Icon name="check" size={28} strokeWidth={2.5} />
            </div>
            <Eyebrow>Step 03 · Copied</Eyebrow>
            <h1>
              You&apos;re all set<span className="accent">.</span> Now paste it
              <span className="accent">.</span>
            </h1>
            <p>
              Your prompt is on the clipboard. Open the AI you like best, paste, and
              let it cook.
            </p>
          </div>

          <div className="layout">
            {/* Output */}
            <CrosshairCard className="output code-well dark">
              <div className="code-bar">
                <span className="pip" />
                <span>prompt.md · {displayTitle(template)}</span>
                <span className="tag">
                  {finalTokens} tokens · {finalKb} KB
                </span>
              </div>
              <div className="code-body">
                {displaySegments.map((s, i) =>
                  s.kind === "normal" ? (
                    <span key={i}>{s.text}</span>
                  ) : (
                    <span key={i} className={s.kind === "mute" ? "c-mute" : "c-acc"}>
                      {s.text}
                    </span>
                  )
                )}
              </div>
              <div className="footbar">
                <span className="label">prompt.md</span>
                <span className="spacer" />
                <button className="btn btn-on-dark btn-sm" onClick={download}>
                  <Icon name="download" size={13} strokeWidth={2} />
                  Download
                </button>
                <button className="btn btn-on-dark btn-sm" onClick={share}>
                  <Icon name="share" size={13} strokeWidth={2} />
                  Share
                </button>
                <button className="btn btn-on-dark-primary btn-sm" onClick={copyAgain}>
                  <Icon name="copy" size={13} strokeWidth={2} />
                  {copiedAgain ? "Copied!" : "Copy again"}
                </button>
              </div>
            </CrosshairCard>

            {/* Sidebar */}
            <div className="side-stack">
              <CrosshairCard className="side-card">
                <h3>Receipt</h3>
                <div className="rows">
                  <div className="row">
                    <span className="k">Template</span>
                    <span className="v">{displayTitle(template)}</span>
                  </div>
                  <div className="row">
                    <span className="k">Answered</span>
                    <span className="v">
                      {built.answered} of {built.total}
                    </span>
                  </div>
                  <div className="row">
                    <span className="k">Skipped</span>
                    <span className="v">{built.skipped}</span>
                  </div>
                  <div className="row">
                    <span className="k">Size</span>
                    <span className="v">{finalKb} KB</span>
                  </div>
                  <div className="row total">
                    <span className="k">Tokens</span>
                    <span className="v">{finalTokens}</span>
                  </div>
                </div>
              </CrosshairCard>

              <CrosshairCard className="side-card">
                <h3>Open in</h3>
                <div className="open-in">
                  <a
                    href={openInUrl("chatgpt", finalText)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="lg gpt">G</span>ChatGPT
                    <span className="arrow">→</span>
                  </a>
                  <a
                    href={openInUrl("claude", finalText)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="lg cl">C</span>Claude
                    <span className="arrow">→</span>
                  </a>
                  <a
                    href={openInUrl("gemini", finalText)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="lg gem">★</span>Gemini
                    <span className="arrow">→</span>
                  </a>
                </div>
              </CrosshairCard>

              <CrosshairCard className="side-card">
                <h3>Save</h3>
                <SavePromptButton
                  source={saveSource}
                  answers={answers}
                  text={finalText}
                  defaultName={displayTitle(template)}
                  savedPromptId={savedPromptId}
                />
              </CrosshairCard>
            </div>
          </div>

          {/* Pro Boosters (premium) */}
          {config.premiumFeatures.proBoosters && (
            <CrosshairCard className="pro-boosters">
              <div className="pro-head">
                <Eyebrow>Pro Boosters</Eyebrow>
                <h3>
                  Sharpen this prompt<span className="accent">.</span>
                </h3>
                <p>
                  Expert enhancement blocks — role priming, a strict output format,
                  a quality self-check, per-model tuning — appended to your prompt.
                  The free prompt already works; these make it sharper.
                </p>
              </div>

              {premium === "unlocked" ? (
                <div className="pro-grid" data-premium="unlocked">
                  {boosters.length === 0 ? (
                    <p className="pro-loading">Loading your boosters…</p>
                  ) : (
                    boosters.map((b) => (
                      <div
                        key={b.id}
                        className={`check${picked[b.id] ? " on" : ""}`}
                        role="checkbox"
                        aria-checked={Boolean(picked[b.id])}
                        tabIndex={0}
                        onClick={() => toggleBooster(b.id)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggleBooster(b.id);
                          }
                        }}
                      >
                        <span className="box" />
                        <div>
                          <div className="label">{b.label}</div>
                          {b.note && <div className="sub">{b.note}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="pro-locked" data-premium="locked">
                  <ul className="pro-perks">
                    <li>
                      <Icon name="check" size={15} strokeWidth={2.4} />
                      Expert role priming & a quality self-check
                    </li>
                    <li>
                      <Icon name="check" size={15} strokeWidth={2.4} />
                      A strict output format tailored to this template
                    </li>
                    <li>
                      <Icon name="check" size={15} strokeWidth={2.4} />
                      Per-model tuning for ChatGPT, Claude & Gemini
                    </li>
                  </ul>
                  <div className="pro-cta">
                    <a
                      className="btn btn-primary"
                      href={config.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Get a code on Telegram →
                    </a>
                    <span className="pro-price">
                      {config.pricing.lifetime}
                    </span>
                  </div>
                  <UnlockForm compact />
                </div>
              )}
            </CrosshairCard>
          )}

          {/* Keep going */}
          {related.length > 0 && (
          <CrosshairCard className="next">
            <div className="next-head">
              <div>
                <Eyebrow>Keep going</Eyebrow>
                <h3>One down. Try a related template?</h3>
                <p>
                  Your answers carry over where they make sense — no need to start
                  from scratch.
                </p>
              </div>
              <Link className="more" href="/prompts">
                Browse all →
              </Link>
            </div>
            <div className="related">
              {related.map((r) => (
                <Link key={r.slug} href={`/prompts/${r.slug}`}>
                  <span className="t">{r.title}</span>
                  <span className="s">
                    {categoryLabel(r.category)} · {r.questions} questions
                  </span>
                </Link>
              ))}
            </div>
          </CrosshairCard>
          )}

          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setStep("form")}
            >
              ← Edit answers
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------------------- FORM STEP ---------------------------- */
  const remaining = built.total - built.answered;
  const minutesLeft = remaining > 0 ? Math.max(1, Math.ceil(remaining / 3)) : 0;

  return (
    <main className="builder-page">
      <Toast show={toast} message="Prompt copied to clipboard" />
      <div className="page">
        <div className="page-col">
          <div className="above">
            <div className="crumbs">
              {trail.map((c, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="sep">/</span>}
                  {c.href ? (
                    <Link href={c.href}>{c.label}</Link>
                  ) : (
                    <span className="here">{c.label}</span>
                  )}
                </Fragment>
              ))}
            </div>
            <span className="step-tag">
              <b>02</b> · Fill
            </span>
          </div>

          <CrosshairCard as="section" className="card" onKeyDown={onFormKeyDown}>
            <header className="head">
              <div className="icon-tile">
                <Icon name={template.icon} size={22} />
              </div>
              <div>
                <h1>{displayTitle(template)}.</h1>
                <p>{template.intro}</p>
              </div>
            </header>

            <div className="progress-block">
              <div className="progress" aria-hidden="true">
                {Array.from({ length: built.total }).map((_, i) => (
                  <div key={i} className={`bar${i < built.answered ? " on" : ""}`} />
                ))}
              </div>
              <div className="progress-meta">
                <span>
                  <b>
                    {built.answered} of {built.total}
                  </b>{" "}
                  answered
                </span>
                <span>{minutesLeft > 0 ? `~ ${minutesLeft} min left` : "ready to copy"}</span>
              </div>
            </div>

            <div className="stack">
              {rows.map((group, gi) =>
                group.length === 2 ? (
                  <div className="field-row" key={gi}>
                    {group.map((f) => (
                      <FieldControl
                        key={f.id}
                        field={f}
                        value={answers.fields[f.id] ?? ""}
                        onText={setField}
                      />
                    ))}
                  </div>
                ) : (
                  <FieldControl
                    key={group[0].id}
                    field={group[0]}
                    value={answers.fields[group[0].id] ?? ""}
                    onText={setField}
                  />
                )
              )}

              {template.checkboxes.length > 0 && (
                <div className="field">
                  <label>Should the prompt also ask for…</label>
                  <div className="check-grid">
                    {template.checkboxes.map((c) => (
                      <div
                        key={c.id}
                        className={`check${answers.checks[c.id] ? " on" : ""}`}
                        role="checkbox"
                        aria-checked={answers.checks[c.id]}
                        tabIndex={0}
                        onClick={() => toggleCheck(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggleCheck(c.id);
                          }
                        }}
                      >
                        <span className="box" />
                        <div>
                          <div className="label">{c.label}</div>
                          {c.sub && <div className="sub">{c.sub}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="foot">
              <span className="meta">
                <b>{built.skipped}</b> skipped · will be left out
              </span>
              <div className="actions">
                <Link className="btn btn-ghost btn-sm btn-back" href={backHref}>
                  ← Back
                </Link>
                <button className="btn btn-primary" onClick={() => void submit()}>
                  Get my prompt →
                </button>
              </div>
            </div>
          </CrosshairCard>

          <p className="hint">
            Press <kbd>Esc</kbd> to go back
          </p>
        </div>
      </div>

      {/* Sticky mobile copy bar */}
      <div className="mobile-copybar">
        <button className="btn btn-primary" onClick={() => void submit()}>
          Get my prompt →
        </button>
      </div>
    </main>
  );
}

/* ---- One field control, switched on type ---- */
function FieldControl({
  field,
  value,
  onText,
}: {
  field: Template["fields"][number];
  value: string;
  onText: (id: string, value: string) => void;
}) {
  const label = (
    <label htmlFor={field.id}>
      {field.label}
      {field.required && <span className="req">*</span>}
    </label>
  );

  if (field.type === "text") {
    return (
      <div className="field">
        {label}
        <input
          id={field.id}
          className="input"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onText(field.id, e.target.value)}
        />
        {field.helper && <span className="helper">{field.helper}</span>}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="field">
        {label}
        <textarea
          id={field.id}
          className="textarea"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onText(field.id, e.target.value)}
        />
        {field.helper && <span className="helper">{field.helper}</span>}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="field">
        {label}
        <select
          id={field.id}
          className="select"
          value={value}
          onChange={(e) => onText(field.id, e.target.value)}
        >
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {field.helper && <span className="helper">{field.helper}</span>}
      </div>
    );
  }

  if (field.type === "pills") {
    return (
      <div className="field">
        {label}
        <div className="pills" role="group" aria-label={field.label}>
          {field.options.map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={value === o}
              className={`pill${value === o ? " on" : ""}`}
              onClick={() => onText(field.id, value === o ? "" : o)}
            >
              {o}
            </button>
          ))}
        </div>
        {field.helper && <span className="helper">{field.helper}</span>}
      </div>
    );
  }

  return null;
}

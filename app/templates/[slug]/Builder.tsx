"use client";

/* Template fill-in — a single dual-column working page. LEFT: the form (Template
 * identity, light). RIGHT: the live prompt as an editable markdown editor (Prompt
 * identity, dark) that mirrors the standalone PromptEditor. The two are linked by a
 * sync model:
 *   - "Synced"  → the editor shows the generated prompt and re-renders live as the
 *                 form/boosters change. Editing the editor detaches it.
 *   - "Custom"  → the user hand-edited the prompt; form changes no longer apply
 *                 ("Reset to form" re-syncs). Saving a Custom prompt forks it to a
 *                 standalone (manual) Prompt; a Synced one saves the template answers.
 * Nothing is pre-selected (state seeds from `blankAnswers`). Anon-safe (Copy /
 * Open-in / Download work logged out; Save prompts sign-in). */

import { Fragment, useMemo, useState, useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import Link from "next/link";
import type { Template } from "@/data/types";
import { displayTitle, categoryLabel } from "@/data/templates";
import {
  buildPrompt,
  blankAnswers,
  openInUrl,
  type Answers,
} from "@/lib/buildPrompt";
import { CrosshairCard } from "@/components/CrosshairCard";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { FieldControl } from "@/components/FieldControl";
import { MarkdownEditorSurface } from "@/components/builder/MarkdownEditorSurface";
import { RatingStars } from "@/components/RatingStars";
import { BookmarkButton } from "@/components/BookmarkButton";
import { UsesBadge } from "@/components/UsesBadge";
import { CreatorChip } from "@/components/CreatorChip";
import { trackUse, trackView } from "@/lib/metrics/track";
import { UnlockForm } from "@/components/UnlockForm";
import { usePremium, fetchBoosters, type Booster } from "@/lib/premium/client";
import { SavePromptButton, type SaveSource } from "@/components/SavePromptButton";
import { useDraft } from "@/lib/drafts/useDraft";
import { useLocalDraft } from "@/lib/drafts/useLocalDraft";
import { blockDocFromTemplate } from "@/lib/blocks/fromTemplate";
import { notebookDraftKey, serializeNotebookDraft } from "@/lib/drafts/notebookDraft";
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
  backHref = "/templates",
  restoreDrafts = false,
}: {
  template: Template;
  related: RelatedLite[];
  /** Pre-fill the form (e.g. reopening a saved prompt). Defaults to a blank set. */
  initialAnswers?: Answers;
  /** Where a "Save" writes to. Defaults to this catalog template. */
  source?: SaveSource;
  /** When set, the Save button re-saves this existing saved_prompts row. */
  savedPromptId?: string;
  /** Override the breadcrumb trail (user templates use "My Library / Title"). */
  crumbs?: { href?: string; label: string }[];
  /** Back-link target for the topbar's "← Back" button. */
  backHref?: string;
  /** Explicit opt-in for local draft restore/autosave. Catalog template pages stay blank. */
  restoreDrafts?: boolean;
}) {
  // Nothing is pre-selected: the fill-in starts blank (authored defaults are a
  // suggestion reference only — see lib/buildPrompt.blankAnswers).
  const [answers, setAnswers] = useState<Answers>(
    () => initialAnswers ?? blankAnswers(template)
  );
  /** null → editor is Synced to the form; a string → user hand-edited (Custom). */
  const [customBody, setCustomBody] = useState<string | null>(null);
  const custom = customBody !== null;

  const saveSource: SaveSource = source ?? { kind: "catalog", slug: template.slug };
  // Ratings/bookmarks target the public catalog only; user templates aren't
  // rateable/bookmarkable yet.
  const isCatalog = saveSource.kind === "catalog";
  // Usage tracking targets the public catalog only (user templates have no public
  // Uses surface yet). A view is the copy-through denominator.
  const metricsTarget = { kind: "catalog" as const, key: template.slug };
  useEffect(() => {
    if (isCatalog) trackView({ kind: "catalog", key: template.slug });
  }, [isCatalog, template.slug]);
  const trail = crumbs ?? [
    { href: "/templates", label: "Templates" },
    { href: `/templates?category=${template.category}`, label: categoryLabel(template.category) },
    { label: displayTitle(template) },
  ];

  const [view, setView] = useState<"form" | "prompt">("form"); // mobile segmented view
  const [toast, setToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  /** Pro Boosters affordance open/closed (post-value upsell; opens for premium). */
  const [boostersOpen, setBoostersOpen] = useState(false);
  /** True after the first successful Copy — gates the post-value "keep this" panel. */
  const [everCopied, setEverCopied] = useState(false);
  /** fieldId → has an unmet required-field error (cleared as the user types). */
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const built = useMemo(() => buildPrompt(template, answers), [template, answers]);
  const draftsEnabled = restoreDrafts && initialAnswers === undefined;

  /* ---- Draft autosave (anon, no account): persist both the in-progress answers
     and any Custom edit so a refresh never loses work. Off when reopening a saved
     prompt (initialAnswers set) and off by default for template pages, because a
     Template is an empty constructor unless a surface explicitly opts into drafts. ---- */
  const { clear: clearDraft } = useDraft({
    templateId: template.id,
    enabled: draftsEnabled,
    answers,
    hasContent: built.answered > 0,
    onRestore: setAnswers,
  });
  const { clear: clearCustomDraft } = useLocalDraft<string>({
    key: `easyprompt.promptcustom.${template.id}`,
    enabled: draftsEnabled,
    value: customBody ?? "",
    hasContent: customBody !== null && customBody.trim().length > 0,
    serialize: (v) => (v.length > 24_000 ? null : v),
    parse: (raw) => (typeof raw === "string" && raw ? raw : null),
    onRestore: (v) => setCustomBody(v),
  });
  useEffect(() => {
    if (initialAnswers !== undefined || restoreDrafts) return;
    clearDraft();
    clearCustomDraft();
  }, [clearCustomDraft, clearDraft, initialAnswers, restoreDrafts]);
  const handleSaved = useCallback(() => {
    clearDraft();
    clearCustomDraft();
  }, [clearDraft, clearCustomDraft]);

  /* ---- Pro Boosters (premium): server-held enhancement blocks appended to the
     built prompt. They feed the Synced prompt; in Custom mode they're already baked
     into the snapshot and further toggles don't apply. ---- */
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

  // Premium users have active toggles worth seeing; open the panel for them.
  useEffect(() => {
    if (premium === "unlocked") setBoostersOpen(true);
  }, [premium]);

  const boosterText = useMemo(
    () => boosters.filter((b) => picked[b.id]).map((b) => b.text).join(""),
    [boosters, picked]
  );
  const finalText = built.text + boosterText;
  /** What every action (Copy/Download/Open-in/Save) and the editor operate on. */
  const effectiveText = customBody ?? finalText;
  const tokens = Math.max(1, Math.ceil(effectiveText.length / 4));
  const kb = (new TextEncoder().encode(effectiveText).length / 1024).toFixed(1);
  const fileName = `${template.slug}.md`;

  const toggleBooster = useCallback((id: string) => {
    setPicked((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  const setField = useCallback((id: string, value: string) => {
    setAnswers((a) => ({ ...a, fields: { ...a.fields, [id]: value } }));
    setErrors((e) => (e[id] ? { ...e, [id]: false } : e));
  }, []);
  const toggleCheck = useCallback((id: string) => {
    setAnswers((a) => ({ ...a, checks: { ...a.checks, [id]: !a.checks[id] } }));
  }, []);

  const flashToast = useCallback(() => {
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  }, []);

  // Required fields keep the template author's intent. Gated only in Synced mode
  // (in Custom mode the user's text is authoritative). Returns false + flags the
  // first missing field when something required is blank.
  const validateRequired = useCallback(() => {
    const missing = template.fields.filter(
      (f) => f.required && (answers.fields[f.id] ?? "").trim().length === 0
    );
    if (missing.length === 0) return true;
    setErrors(Object.fromEntries(missing.map((f) => [f.id, true])));
    setView("form");
    const el = typeof document !== "undefined" ? document.getElementById(missing[0].id) : null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus?.();
    return false;
  }, [template.fields, answers.fields]);

  const copy = useCallback(async () => {
    if (!custom && !validateRequired()) return;
    if (await copyText(effectiveText)) {
      if (isCatalog) trackUse({ kind: "catalog", key: template.slug }, "copy");
      setCopied(true);
      setEverCopied(true);
      flashToast();
      window.setTimeout(() => setCopied(false), 1600);
    }
  }, [custom, validateRequired, effectiveText, flashToast, isCatalog, template.slug]);

  const download = useCallback(() => {
    const blob = new Blob([effectiveText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [effectiveText, fileName]);

  // Reset Custom → Synced. Two-step (guards accidental loss of manual edits).
  const resetTimer = useRef<number | undefined>(undefined);
  const resetToForm = useCallback(() => {
    setConfirmReset((c) => {
      if (c) {
        window.clearTimeout(resetTimer.current);
        setCustomBody(null);
        return false;
      }
      resetTimer.current = window.setTimeout(() => setConfirmReset(false), 3000);
      return true;
    });
  }, []);
  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  // Bridge to the block builder — stash the in-progress answers as the builder's
  // anonymous draft so crossing keeps the user's work.
  const openInBuilder = useCallback(() => {
    try {
      const json = serializeNotebookDraft(blockDocFromTemplate(template, answers));
      if (json) window.localStorage.setItem(notebookDraftKey(`new-from-${template.slug}`), json);
    } catch {
      /* non-fatal — the builder still seeds from template defaults */
    }
  }, [template, answers]);

  // Esc just blurs the active field (the app-wide "close current view" convention;
  // there's no overlay to close here, and it must never navigate the page away).
  const onFormKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
  }, []);

  /* ---- pair consecutive pill fields into a .field-row ---- */
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

  const remaining = built.total - built.answered;
  const minutesLeft = remaining > 0 ? Math.max(1, Math.ceil(remaining / 3)) : 0;
  const proBoosters = config.premiumFeatures.proBoosters;

  const openIn = (
    <div className="tpl-openin" aria-label="Open this prompt in">
      <a className="tpl-open" href={openInUrl("chatgpt", effectiveText)} target="_blank" rel="noopener noreferrer" onClick={() => isCatalog && trackUse(metricsTarget, "open_chatgpt")}>ChatGPT</a>
      <a className="tpl-open" href={openInUrl("claude", effectiveText)} target="_blank" rel="noopener noreferrer" onClick={() => isCatalog && trackUse(metricsTarget, "open_claude")}>Claude</a>
      <a className="tpl-open" href={openInUrl("gemini", effectiveText)} target="_blank" rel="noopener noreferrer" onClick={() => isCatalog && trackUse(metricsTarget, "open_gemini")}>Gemini</a>
    </div>
  );

  // Pro Boosters — a collapsed affordance under the prompt (no longer wedged into
  // the form). Locked: a one-line "sharpen" pitch that expands to perks + unlock.
  // Unlocked: the live toggle list (opened by the premium effect above).
  const activeBoosters = boosters.filter((b) => picked[b.id]).length;
  const boostersNode = proBoosters ? (
    <section className={`tpl-boost${boostersOpen ? " open" : ""}`} aria-label="Pro Boosters">
      <button
        type="button"
        className="tpl-boost-toggle"
        aria-expanded={boostersOpen}
        onClick={() => setBoostersOpen((o) => !o)}
      >
        <span className="tpl-boost-spark" aria-hidden="true">
          <Icon name="zap" size={14} strokeWidth={2} />
        </span>
        <span className="tpl-boost-title">
          {premium === "unlocked" ? "Pro Boosters" : "Sharpen with Pro Boosters"}
        </span>
        <span className="tpl-boost-sub">
          {premium === "unlocked"
            ? `${activeBoosters} on`
            : "role priming · output format · self-check"}
        </span>
        <Icon name={boostersOpen ? "minus" : "plus"} size={15} strokeWidth={2} />
      </button>

      {boostersOpen && (
        <div className="tpl-boost-body">
          {premium === "unlocked" ? (
            boosters.length === 0 ? (
              <p className="pro-loading">Loading your boosters…</p>
            ) : (
              <div className="pro-grid" data-premium="unlocked">
                {boosters.map((b) => (
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
                ))}
              </div>
            )
          ) : (
            <div className="pro-locked" data-premium="locked">
              <ul className="pro-perks">
                <li>
                  <Icon name="check" size={15} strokeWidth={2.4} />
                  Expert role priming &amp; a quality self-check
                </li>
                <li>
                  <Icon name="check" size={15} strokeWidth={2.4} />
                  A strict output format tailored to this template
                </li>
                <li>
                  <Icon name="check" size={15} strokeWidth={2.4} />
                  Per-model tuning for ChatGPT, Claude &amp; Gemini
                </li>
              </ul>
              <div className="pro-cta">
                <a className="btn btn-primary btn-sm" href={config.checkoutUrl} target="_blank" rel="noopener noreferrer">
                  Get a code on Telegram →
                </a>
                <span className="pro-price">{config.pricing.lifetime}</span>
              </div>
              <UnlockForm compact />
            </div>
          )}
        </div>
      )}
    </section>
  ) : null;

  return (
    <main className="builder-page tpl-dual">
      <Toast show={toast} message="Prompt copied to clipboard" />

      {/* ---- Topbar: breadcrumbs + back + progress ---- */}
      <div className="tpl-topbar">
        <div className="tpl-topbar-left">
          <Link className="btn btn-ghost btn-sm tpl-back" href={backHref}>
            ← Back
          </Link>
          <nav className="crumbs" aria-label="Breadcrumb">
            {trail.map((c, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="sep">/</span>}
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span className="here">{c.label}</span>}
              </Fragment>
            ))}
          </nav>
        </div>
        {isCatalog && (
          <div className="tpl-topbar-meta">
            <CreatorChip creator={{ kind: "house" }} />
          </div>
        )}
      </div>

      {/* ---- Mobile segmented view switch (desktop shows both columns) ---- */}
      <div className="tpl-seg" role="tablist" aria-label="Switch view">
        <button
          role="tab"
          aria-selected={view === "form"}
          className={`tpl-seg-btn${view === "form" ? " on" : ""}`}
          onClick={() => setView("form")}
        >
          Form
        </button>
        <button
          role="tab"
          aria-selected={view === "prompt"}
          className={`tpl-seg-btn${view === "prompt" ? " on" : ""}`}
          onClick={() => setView("prompt")}
        >
          Prompt
        </button>
      </div>

      <div className="tpl-grid" data-view={view}>
        {/* ===================== LEFT: form ===================== */}
        <CrosshairCard as="section" className="tpl-col-form" onKeyDown={onFormKeyDown}>
          <header className="tpl-head">
            <div className="icon-tile">
              <Icon name={template.icon} size={22} />
            </div>
            <div>
              <h1>{displayTitle(template)}</h1>
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
                <b>{built.answered} of {built.total}</b> answered
              </span>
              <span>{minutesLeft > 0 ? `~ ${minutesLeft} min left` : "ready to copy"}</span>
            </div>
          </div>

          <div className="blocks">
            {rows.map((group, gi) => (
              <div className="block" key={gi}>
                {group.length === 2 ? (
                  <div className="field-row">
                    {group.map((f) => (
                      <FieldControl
                        key={f.id}
                        field={f}
                        value={answers.fields[f.id] ?? ""}
                        onText={setField}
                        error={errors[f.id] ? "Required — add a value." : undefined}
                      />
                    ))}
                  </div>
                ) : (
                  <FieldControl
                    field={group[0]}
                    value={answers.fields[group[0].id] ?? ""}
                    onText={setField}
                    error={errors[group[0].id] ? "Required — add a value." : undefined}
                  />
                )}
              </div>
            ))}

            {template.checkboxes.length > 0 && (
              <div className="block">
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
              </div>
            )}
          </div>

        </CrosshairCard>

        {/* ===================== RIGHT: live prompt ===================== */}
        <aside className="tpl-col-prompt" aria-label="Generated prompt">
          <div className="tpl-prompt-actions">
            <div className="tpl-prompt-state">
              <span className="tpl-prog-mini" aria-hidden="true">
                <b>{built.answered}</b>/{built.total}
              </span>
              {custom ? (
                <span className="tpl-mode is-custom">
                  <span className="tpl-mode-dot" aria-hidden="true" />
                  Edited · form changes paused
                  <button type="button" className="tpl-reset" onClick={resetToForm}>
                    {confirmReset ? "Discard edits?" : "Reset to form"}
                  </button>
                </span>
              ) : (
                <span className="tpl-mode is-synced">
                  <span className="tpl-mode-dot" aria-hidden="true" />
                  Synced with form
                </span>
              )}
            </div>
            <div className="tpl-prompt-buttons">
              {openIn}
              <button className="btn btn-ghost btn-sm" onClick={download} aria-label="Download as .md">
                <Icon name="download" size={14} strokeWidth={2} />
                <span className="tpl-btn-label">Download</span>
              </button>
              <button className={`btn btn-primary btn-sm${copied ? " is-copied" : ""}`} onClick={() => void copy()}>
                <Icon name={copied ? "check" : "copy"} size={14} strokeWidth={2} />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="tpl-prompt-scroll">
            <MarkdownEditorSurface
              value={effectiveText}
              onChange={setCustomBody}
              fileName={fileName}
              tokens={tokens}
              kb={kb}
              tag="✎ editable"
              placeholder={"Your prompt builds here as you fill the form — or write it yourself."}
              ariaLabel="Generated prompt (editable markdown)"
              className="tpl-md"
            />
          </div>

          {boostersNode}

          <div className="tpl-save">
            <SavePromptButton
              source={saveSource}
              answers={answers}
              defaultName={displayTitle(template)}
              savedPromptId={savedPromptId}
              customBody={custom ? effectiveText : undefined}
              onSaved={handleSaved}
              variant="outline"
            />
            {isCatalog && (
              <Link className="tpl-fork" href={`/build/template?from=${template.slug}`} onClick={openInBuilder}>
                Make it your own template →
              </Link>
            )}
          </div>
        </aside>
      </div>

      {/* ===================== FOOTER ===================== */}
      {((isCatalog && everCopied) || related.length > 0) && (
        <footer className="tpl-footer">
          {isCatalog && everCopied && (
            <CrosshairCard className="tpl-rate">
              <div>
                <h3>Keep this prompt?</h3>
                <p>Rate the template and bookmark it for later.</p>
              </div>
              <div className="tpl-rate-actions">
                <RatingStars target={{ kind: "catalog", key: template.slug }} />
                <BookmarkButton target={{ kind: "catalog", key: template.slug }} />
                <UsesBadge target={{ kind: "catalog", key: template.slug }} />
              </div>
            </CrosshairCard>
          )}
          {related.length > 0 && (
            <CrosshairCard className="tpl-next">
              <div className="tpl-next-head">
                <div>
                  <h3>Keep going — try a related template</h3>
                  <p>Your answers carry over where they make sense.</p>
                </div>
                <Link className="more" href="/templates">
                  Browse all →
                </Link>
              </div>
              <div className="related">
                {related.map((r) => (
                  <Link key={r.slug} href={`/templates/${r.slug}`}>
                    <span className="t">{r.title}</span>
                    <span className="s">
                      {categoryLabel(r.category)} · {r.questions} questions
                    </span>
                  </Link>
                ))}
              </div>
            </CrosshairCard>
          )}
        </footer>
      )}

      {/* ---- Sticky mobile action bar ---- */}
      <div className="tpl-mobilebar">
        <button className="btn btn-ghost btn-sm" onClick={() => setView(view === "form" ? "prompt" : "form")}>
          {view === "form" ? "View prompt" : "View form"}
        </button>
        <button className={`btn btn-primary${copied ? " is-copied" : ""}`} onClick={() => void copy()}>
          <Icon name={copied ? "check" : "copy"} size={15} strokeWidth={2} />
          {copied ? "Copied!" : "Copy prompt"}
        </button>
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarkButton } from "@/components/BookmarkButton";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { SavePromptButton, type SaveSource } from "@/components/SavePromptButton";
import { Toast } from "@/components/Toast";
import { ProviderOpenActions } from "@/components/detail/ProviderOpenActions";
import type { BookmarkTarget } from "@/lib/bookmarks/schema";
import { copyText } from "@/lib/clipboard";
import { openInUrl, type Answers } from "@/lib/buildPrompt";
import {
  blankTemplateAnswers,
  suggestedTemplateAnswers,
  type InputBlock,
  type OptionalToggleBlock,
  type TemplateAnswers,
  type TemplateDefinition,
} from "@/lib/templates/model";
import { compileTemplate } from "@/lib/templates/compiler";
import {
  compatibleDraftAnswers,
  durableFillKey,
  durableFillPrefix,
  fillSessionKey,
  makeFillDraft,
  parseFillDraft,
  templateRevisionKey,
  writeDurableFillDraft,
  type FillDraft,
} from "@/lib/templates/fillDraft";
import { provenanceFromTemplate } from "@/lib/templates/provenance";
import { storeEditAsPromptDraft } from "@/lib/templates/editAsPrompt";
import { trackUse, trackView } from "@/lib/metrics/track";
import type { MetricTarget } from "@/lib/metrics/schema";
import "./UnifiedTemplateFill.css";

type RestoreCandidate = { draft: FillDraft; stale: boolean };

function toSavedAnswers(definition: TemplateDefinition, answers: TemplateAnswers): Answers {
  const fields: Record<string, string> = {};
  const checks: Record<string, boolean> = {};
  for (const block of definition.document.blocks) {
    if (block.kind === "input") fields[block.id] = typeof answers[block.id] === "string" ? answers[block.id] as string : "";
    if (block.kind === "optional_toggle") checks[block.id] = answers[block.id] === true;
  }
  return { fields, checks };
}

function InputControl({
  block,
  value,
  invalid,
  onChange,
}: {
  block: InputBlock;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const errorId = `${block.id}-error`;
  const helperId = block.helper ? `${block.id}-helper` : undefined;
  const labelId = `${block.id}-label`;
  const describedBy = [helperId, invalid ? errorId : undefined].filter(Boolean).join(" ") || undefined;
  const pills = block.input_type === "single_choice" && block.presentation === "pills";
  return (
    <div className={`ut-question${invalid ? " has-error" : ""}`}>
      <label id={labelId} htmlFor={pills ? undefined : block.id}>
        {block.label} {block.required && <span className="ut-required">Required</span>}
      </label>
      {block.helper && <p id={helperId} className="ut-helper">{block.helper}</p>}
      {block.input_type === "long_text" ? (
        <textarea
          id={block.id}
          className="textarea"
          value={value}
          placeholder={block.placeholder}
          aria-invalid={invalid}
          aria-required={block.required}
          required={block.required}
          aria-describedby={describedBy}
          maxLength={4000}
          rows={5}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : pills ? (
        <div
          id={block.id}
          className="ut-pills"
          role="radiogroup"
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          aria-required={block.required}
        >
          {(block.options ?? []).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={value === option}
              className={`ut-pill${value === option ? " is-selected" : ""}`}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : block.input_type === "single_choice" ? (
        <select
          id={block.id}
          className="select"
          value={value}
          aria-invalid={invalid}
          aria-required={block.required}
          required={block.required}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Choose one</option>
          {(block.options ?? []).map((option) => <option key={option}>{option}</option>)}
        </select>
      ) : (
        <input
          id={block.id}
          className="input"
          value={value}
          placeholder={block.placeholder}
          aria-invalid={invalid}
          aria-required={block.required}
          required={block.required}
          aria-describedby={describedBy}
          maxLength={4000}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {invalid && <p id={errorId} className="ut-error">Answer this required question.</p>}
    </div>
  );
}

function ToggleControl({
  block,
  selected,
  onChange,
}: {
  block: OptionalToggleBlock;
  selected: boolean;
  onChange: (selected: boolean) => void;
}) {
  return (
    <label className="ut-toggle">
      <input type="checkbox" checked={selected} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <strong>{block.label}</strong>
        {block.helper && <small>{block.helper}</small>}
      </span>
    </label>
  );
}

export function UnifiedTemplateFill({
  definition,
  breadcrumbs,
  source,
  initialAnswers,
  bookmarkTarget,
  ownerEditHref,
  mode = "fill",
  onBackToBuild,
}: {
  definition: TemplateDefinition;
  breadcrumbs: BreadcrumbItem[];
  source?: SaveSource;
  initialAnswers?: TemplateAnswers;
  bookmarkTarget?: BookmarkTarget;
  ownerEditHref?: string;
  mode?: "fill" | "test";
  onBackToBuild?: () => void;
}) {
  const router = useRouter();
  const blank = useMemo(() => blankTemplateAnswers(definition.document), [definition.document]);
  const [answers, setAnswers] = useState<TemplateAnswers>(() => initialAnswers ?? blank);
  const [view, setView] = useState<"form" | "prompt">("form");
  const [restoreCandidate, setRestoreCandidate] = useState<RestoreCandidate | null>(null);
  const [restoreNotice, setRestoreNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const compiled = useMemo(() => compileTemplate(definition, answers), [answers, definition]);
  const interactive = definition.document.blocks.filter(
    (block): block is InputBlock | OptionalToggleBlock =>
      block.enabled && (block.kind === "input" || block.kind === "optional_toggle")
  );
  const savedAnswers = useMemo(() => toSavedAnswers(definition, answers), [answers, definition]);
  const provenance = useMemo(() => provenanceFromTemplate(definition), [definition]);
  const metricTarget = useMemo<MetricTarget | undefined>(() => {
    if (bookmarkTarget?.kind !== "catalog" && bookmarkTarget?.kind !== "user_template") return undefined;
    return { kind: bookmarkTarget.kind, key: bookmarkTarget.key };
  }, [bookmarkTarget?.key, bookmarkTarget?.kind]);
  const groupMap = useMemo(
    () => new Map(definition.document.form_groups.map((group) => [group.id, group])),
    [definition.document.form_groups]
  );

  useEffect(() => {
    if (mode === "fill" && metricTarget) trackView(metricTarget);
  }, [metricTarget, mode]);

  useEffect(() => {
    if (mode !== "fill" || initialAnswers) {
      hydratedRef.current = true;
      return;
    }
    const url = new URL(window.location.href);
    if (url.searchParams.get("restoreDraft") === "1") {
      const exactKey = durableFillKey(definition);
      const durable = parseFillDraft(window.localStorage.getItem(exactKey));
      if (durable) {
        const restored = compatibleDraftAnswers(durable, definition);
        setAnswers({ ...blank, ...restored.answers });
        window.localStorage.removeItem(exactKey);
      }
      url.searchParams.delete("restoreDraft");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      hydratedRef.current = true;
      return;
    }

    const session = parseFillDraft(window.sessionStorage.getItem(fillSessionKey(definition)));
    if (session) {
      const restored = compatibleDraftAnswers(session, definition);
      setAnswers({ ...blank, ...restored.answers });
      hydratedRef.current = true;
      return;
    }

    const prefix = durableFillPrefix(definition.identity.template_key);
    let newest: FillDraft | null = null;
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const candidate = parseFillDraft(window.localStorage.getItem(key));
      if (!candidate) {
        window.localStorage.removeItem(key);
        continue;
      }
      if (!newest || Date.parse(candidate.saved_at) > Date.parse(newest.saved_at)) newest = candidate;
    }
    if (newest) {
      setRestoreCandidate({ draft: newest, stale: newest.revision_key !== templateRevisionKey(definition) });
    }
    hydratedRef.current = true;
  }, [blank, definition, initialAnswers, mode]);

  useEffect(() => {
    if (mode !== "fill" || !hydratedRef.current || initialAnswers) return;
    try {
      window.sessionStorage.setItem(fillSessionKey(definition), JSON.stringify(makeFillDraft(definition, answers)));
    } catch {
      // Active state remains in memory; storage failure is non-destructive.
    }
  }, [answers, definition, initialAnswers, mode]);

  const patchAnswer = useCallback((id: string, value: string | boolean) => {
    setAnswers((current) => ({ ...current, [id]: value }));
  }, []);

  const revealValidation = useCallback(() => {
    setShowErrors(true);
    setView("form");
    requestAnimationFrame(() => summaryRef.current?.focus());
  }, []);

  const copy = useCallback(async () => {
    if (!compiled.actions.can_copy) {
      revealValidation();
      return;
    }
    if (await copyText(compiled.text)) {
      if (metricTarget) trackUse(metricTarget, "copy");
      setCopied(true);
      setToast("Prompt copied to clipboard");
      window.setTimeout(() => setCopied(false), 1600);
      window.setTimeout(() => setToast(""), 2200);
    }
  }, [compiled, metricTarget, revealValidation]);

  const saveForLater = useCallback(() => {
    const result = writeDurableFillDraft(window.localStorage, definition, answers);
    if (result === "saved") {
      setToast("Your answers were saved on this device for 30 days");
      window.setTimeout(() => setToast(""), 2400);
    } else if (result === "too_large") {
      setToast("Local draft storage is full. Remove an older draft and try again.");
    } else {
      setToast("This browser could not save the fill draft. Your answers remain open.");
    }
  }, [answers, definition]);

  const startFresh = useCallback(() => {
    setAnswers(blank);
    setRestoreCandidate(null);
    setRestoreNotice("");
    window.sessionStorage.removeItem(fillSessionKey(definition));
    const prefix = durableFillPrefix(definition.identity.template_key);
    const remove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(prefix)) remove.push(key);
    }
    remove.forEach((key) => window.localStorage.removeItem(key));
  }, [blank, definition]);

  const restore = useCallback(() => {
    if (!restoreCandidate) return;
    const compatible = compatibleDraftAnswers(restoreCandidate.draft, definition);
    setAnswers({ ...blank, ...compatible.answers });
    setRestoreNotice(
      restoreCandidate.stale
        ? `Restored ${compatible.restored} answer${compatible.restored === 1 ? "" : "s"}. ${compatible.skipped} could not be restored because the Template changed.`
        : "Saved answers restored."
    );
    setRestoreCandidate(null);
  }, [blank, definition, restoreCandidate]);

  const editAsPrompt = useCallback(() => {
    if (!compiled.actions.can_save_prompt) return;
    if (!storeEditAsPromptDraft({
      name: `${definition.metadata.title} — Prompt`,
      body: compiled.text,
      provenance,
      created_at: new Date().toISOString(),
    })) {
      setToast("This Prompt is too large to open in the editor");
      return;
    }
    router.push("/build/prompt?templateDraft=1");
  }, [compiled.actions.can_save_prompt, compiled.text, definition.metadata.title, provenance, router]);

  const requiredMissing = compiled.completion.missing_required_block_ids;
  const requiredCount = compiled.completion.required_count;
  const requiredAnswered = compiled.completion.required_answered_count;
  let previousGroup: string | undefined;

  return (
    <main className={`unified-template-fill${mode === "test" ? " is-test" : ""}`}>
      <Toast show={Boolean(toast)} message={toast} />
      <header className="ut-topbar">
        <Breadcrumbs items={breadcrumbs} />
        <div className="ut-top-actions">
          {mode === "test" && onBackToBuild && (
            <button className="btn btn-ghost btn-sm" onClick={onBackToBuild}>Back to build</button>
          )}
          {bookmarkTarget && <BookmarkButton compact target={bookmarkTarget} />}
          {ownerEditHref && <Link className="btn btn-ghost btn-sm" href={ownerEditHref}><Icon name="wrench" size={14} /> Edit Template</Link>}
        </div>
      </header>

      {restoreCandidate && (
        <aside className="ut-restore" aria-label="Saved answers available">
          <div>
            <strong>{restoreCandidate.stale ? "This Template changed since you saved these answers." : "Continue with your saved answers?"}</strong>
            <p>{restoreCandidate.stale ? "Compatible answers can be restored. Anything that no longer matches stays blank. Start fresh removes all saved answers for this Template from this device." : "Your new session stays blank until you choose Restore. Start fresh removes these saved answers from this device."}</p>
          </div>
          <div className="ut-restore-actions">
            <button className="btn btn-primary btn-sm" onClick={restore}>Restore</button>
            <button className="btn btn-ghost btn-sm" onClick={startFresh}>Start fresh</button>
          </div>
        </aside>
      )}
      {restoreNotice && <p className="ut-restore-notice" role="status">{restoreNotice}</p>}

      <div className="ut-view-switch" role="group" aria-label={mode === "test" ? "Template Test view" : "Template view"}>
        <button aria-pressed={view === "form"} onClick={() => setView("form")}>Form</button>
        <button aria-pressed={view === "prompt"} onClick={() => setView("prompt")}>Prompt</button>
      </div>

      <div className="ut-workspace" data-view={view}>
        <section className="ut-form panel" aria-labelledby="ut-title">
          <div className="ut-heading">
            <div className="icon-tile"><Icon name={definition.metadata.icon} size={22} /></div>
            <div>
              {mode === "test" && <span className="ut-eyebrow">Test as user</span>}
              <h1 id="ut-title">{definition.metadata.title}</h1>
              <p>{definition.metadata.outcome || "Fill what matters to generate your Prompt."}</p>
            </div>
          </div>

          <div className="ut-progress">
            <span>{requiredCount ? <><b>{requiredAnswered} of {requiredCount}</b> required questions answered</> : <b>Fill what matters</b>}</span>
            <span>{interactive.length} item{interactive.length === 1 ? "" : "s"} to fill</span>
          </div>

          {showErrors && compiled.blocking_issues.length > 0 && (
            <div className="ut-validation-summary" ref={summaryRef} tabIndex={-1} role="alert">
              <strong>{compiled.blocking_issues.every((item) => item.code === "missing_required_answer") ? "Finish the required questions before using this Prompt." : "This Template needs attention before it can generate a Prompt."}</strong>
              <ul>
                {compiled.blocking_issues.map((item) => (
                  <li key={`${item.code}-${item.source_block_id}`}>
                    {item.source_block_id ? (
                      <a
                        href={`#${item.source_block_id}`}
                        onClick={(event) => {
                          event.preventDefault();
                          const target = document.getElementById(item.source_block_id!);
                          const focusTarget = target?.matches('[role="radiogroup"]')
                            ? target.querySelector<HTMLElement>('[role="radio"]')
                            : target;
                          focusTarget?.focus();
                        }}
                      >{item.message}</a>
                    ) : item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="ut-questions">
            {interactive.map((block) => {
              const group = block.group_id ? groupMap.get(block.group_id) : undefined;
              const showGroup = Boolean(group && previousGroup !== block.group_id);
              previousGroup = block.group_id;
              return (
                <div key={block.id} className="ut-question-wrap">
                  {showGroup && group && (
                    <header className="ut-group-heading">
                      <h2>{group.title}</h2>
                      {group.description && <p>{group.description}</p>}
                    </header>
                  )}
                  {block.kind === "input" ? (
                    <InputControl
                      block={block}
                      value={typeof answers[block.id] === "string" ? answers[block.id] as string : ""}
                      invalid={showErrors && requiredMissing.includes(block.id)}
                      onChange={(value) => patchAnswer(block.id, value)}
                    />
                  ) : (
                    <ToggleControl block={block} selected={answers[block.id] === true} onChange={(value) => patchAnswer(block.id, value)} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="ut-form-actions">
            {mode === "test" ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setAnswers(suggestedTemplateAnswers(definition.document))}>Load suggested answers</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setAnswers(blank)}>Reset test answers</button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" onClick={saveForLater}>Save for later</button>
                <button className="btn btn-ghost btn-sm" onClick={startFresh}>Start fresh</button>
              </>
            )}
          </div>
        </section>

        <aside className="ut-prompt" aria-label="Generated Prompt">
          <div className="ut-prompt-status">
            <span><span className={`ut-status-dot${compiled.is_actionable ? " is-ready" : ""}`} />{compiled.is_actionable ? "Prompt ready" : "Synced with form"}</span>
            <span>{compiled.text.length.toLocaleString()} characters</span>
          </div>
          <CodeWell
            title={`${definition.metadata.slug ?? "generated-prompt"}.md`}
            segments={compiled.segments}
            tokens={Math.max(1, Math.ceil(compiled.text.length / 4))}
            kb={(new TextEncoder().encode(compiled.text).length / 1024).toFixed(1)}
            empty={<span className="ut-empty-prompt">Your Prompt appears here as you answer.</span>}
          />
          <div className="ut-output-actions">
            <ProviderOpenActions
              disabled={!compiled.actions.can_open_provider}
              links={{
                chatgpt: { href: openInUrl("chatgpt", compiled.text), onClick: () => { void copyText(compiled.text); if (metricTarget) trackUse(metricTarget, "open_chatgpt"); } },
                claude: { href: openInUrl("claude", compiled.text), onClick: () => { void copyText(compiled.text); if (metricTarget) trackUse(metricTarget, "open_claude"); } },
                gemini: { href: openInUrl("gemini", compiled.text), onClick: () => { void copyText(compiled.text); if (metricTarget) trackUse(metricTarget, "open_gemini"); } },
              }}
            />
            <button className="btn btn-primary" onClick={() => void copy()}>
              <Icon name={copied ? "check" : "copy"} size={15} /> {copied ? "Copied" : "Copy Prompt"}
            </button>
          </div>
          <div className="ut-secondary-actions">
            <button className="btn btn-ghost btn-sm" disabled={!compiled.actions.can_save_prompt} onClick={editAsPrompt}>
              <Icon name="wrench" size={14} /> Edit as Prompt
            </button>
            {source && source.kind !== "community" && compiled.actions.can_save_prompt && (
              <SavePromptButton
                source={source}
                answers={savedAnswers}
                defaultName={definition.metadata.title}
                generatedBody={compiled.text}
                provenance={provenance}
                onAuthGateNavigate={saveForLater}
                authGateNext={() => `${window.location.pathname}?restoreDraft=1`}
                variant="outline"
              />
            )}
            {(!source || source.kind === "community") && compiled.actions.can_save_prompt && (
              <SavePromptButton
                answers={savedAnswers}
                defaultName={definition.metadata.title}
                customBody={compiled.text}
                provenance={provenance}
                onAuthGateNavigate={saveForLater}
                authGateNext={() => `${window.location.pathname}?restoreDraft=1`}
                variant="outline"
              />
            )}
          </div>
          {!compiled.actions.can_save_prompt && compiled.actions.save_disabled_reason && (
            <p className="ut-action-note">{compiled.actions.save_disabled_reason}</p>
          )}
        </aside>
      </div>

      <div className="ut-mobile-action">
        {view === "form" ? (
          <button className="btn btn-primary" onClick={() => setView("prompt")}>Review Prompt <Icon name="arrow-right" size={15} /></button>
        ) : (
          <button className="btn btn-primary" onClick={() => void copy()}><Icon name="copy" size={15} /> Copy Prompt</button>
        )}
      </div>
    </main>
  );
}

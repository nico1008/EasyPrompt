"use client";

/* Authoring UI for a custom template. Edits meta + fields + checkboxes, shows a
 * live preview by reusing buildPrompt(inputToTemplate(...)), and submits the
 * whole thing as a JSON `payload` to the create/update server action (which
 * re-validates with the same validateUserTemplate the preview/tests use). */

import Link from "next/link";
import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CATEGORIES } from "@/data/templates";
import { ICON_NAMES } from "@/components/iconNames";
import { buildPrompt, defaultAnswers } from "@/lib/buildPrompt";
import { inputToTemplate, type UserTemplateInput } from "@/lib/userTemplates/validate";
import {
  createUserTemplateAction,
  updateUserTemplateAction,
  type EditorState,
} from "@/lib/userTemplates/actions";
import type { Field, Checkbox } from "@/data/types";
import "./TemplateEditor.css";

type FieldType = "text" | "textarea" | "select" | "pills";
type FieldRow = {
  key: string;
  id: string;
  type: FieldType;
  label: string;
  prefix: string;
  placeholder: string;
  helper: string;
  required: boolean;
  options: string; // comma-separated in the UI
  default: string;
};
type CheckRow = {
  key: string;
  id: string;
  label: string;
  sub: string;
  injected_text: string;
  default: boolean;
};

export type EditorInitial = {
  id?: string;
  title: string;
  category: string;
  icon: string;
  tag: string;
  blurb: string;
  intro: string;
  base_prompt: string;
  fields: Field[];
  checkboxes: Checkbox[];
};

const uid = () => Math.random().toString(36).slice(2, 9);
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function SubmitRow({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="editor-actions">
      <Link className="btn btn-ghost" href="/my">
        Cancel
      </Link>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : editing ? "Save changes" : "Create template"}
      </button>
    </div>
  );
}

export function TemplateEditor({ initial }: { initial?: EditorInitial }) {
  const editing = Boolean(initial?.id);
  const [state, formAction] = useActionState(
    editing ? updateUserTemplateAction : createUserTemplateAction,
    {} as EditorState
  );

  const [meta, setMeta] = useState({
    title: initial?.title ?? "",
    category: initial?.category ?? CATEGORIES[0].id,
    icon: initial?.icon ?? "star",
    tag: initial?.tag ?? "",
    blurb: initial?.blurb ?? "",
    intro: initial?.intro ?? "",
    base_prompt: initial?.base_prompt ?? "",
  });
  const setMetaField = (k: keyof typeof meta, v: string) =>
    setMeta((m) => ({ ...m, [k]: v }));

  const [fields, setFields] = useState<FieldRow[]>(() =>
    (initial?.fields ?? []).map((f) => ({
      key: uid(),
      id: f.id,
      type: f.type,
      label: f.label,
      prefix: f.prefix,
      placeholder: "placeholder" in f ? f.placeholder ?? "" : "",
      helper: f.helper ?? "",
      required: f.required ?? false,
      options: "options" in f && Array.isArray(f.options) ? f.options.join(", ") : "",
      default: f.default ?? "",
    }))
  );
  const [checks, setChecks] = useState<CheckRow[]>(() =>
    (initial?.checkboxes ?? []).map((c) => ({
      key: uid(),
      id: c.id,
      label: c.label,
      sub: c.sub ?? "",
      injected_text: c.injected_text,
      default: c.default ?? false,
    }))
  );

  const updateField = (key: string, patch: Partial<FieldRow>) =>
    setFields((fs) => fs.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  const addField = () =>
    setFields((fs) => [
      ...fs,
      {
        key: uid(),
        id: "",
        type: "text",
        label: "",
        prefix: "\n\n# ",
        placeholder: "",
        helper: "",
        required: false,
        options: "",
        default: "",
      },
    ]);
  const removeField = (key: string) =>
    setFields((fs) => fs.filter((f) => f.key !== key));

  const updateCheck = (key: string, patch: Partial<CheckRow>) =>
    setChecks((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const addCheck = () =>
    setChecks((cs) => [
      ...cs,
      { key: uid(), id: "", label: "", sub: "", injected_text: "\n- ", default: false },
    ]);
  const removeCheck = (key: string) =>
    setChecks((cs) => cs.filter((c) => c.key !== key));

  // Editor rows → validated input shape (with id generation + de-dupe).
  const input = useMemo<UserTemplateInput>(() => {
    const seen = new Set<string>();
    const mkId = (raw: string, fallback: string) => {
      const base = slugify(raw) || fallback;
      let id = base;
      let n = 2;
      while (seen.has(id)) id = `${base}-${n++}`;
      seen.add(id);
      return id;
    };
    const f: UserTemplateInput["fields"] = fields.map((row, i) => ({
      id: mkId(row.id || row.label, `field-${i + 1}`),
      type: row.type,
      label: row.label,
      prefix: row.prefix,
      placeholder: row.placeholder || undefined,
      helper: row.helper || undefined,
      required: row.required || undefined,
      default: row.default || undefined,
      options:
        row.type === "select" || row.type === "pills"
          ? row.options.split(",").map((o) => o.trim()).filter(Boolean)
          : undefined,
    }));
    const c: UserTemplateInput["checkboxes"] = checks.map((row, i) => ({
      id: mkId(row.id || row.label, `option-${i + 1}`),
      label: row.label,
      sub: row.sub || undefined,
      injected_text: row.injected_text,
      default: row.default || undefined,
    }));
    return {
      title: meta.title,
      category: meta.category,
      icon: meta.icon,
      tag: meta.tag || undefined,
      blurb: meta.blurb || undefined,
      intro: meta.intro || undefined,
      base_prompt: meta.base_prompt,
      fields: f,
      checkboxes: c,
    };
  }, [meta, fields, checks]);

  const preview = useMemo(() => {
    try {
      const tpl = inputToTemplate(input);
      return buildPrompt(tpl, defaultAnswers(tpl)).text;
    } catch {
      return "";
    }
  }, [input]);

  return (
    <main className="my-page editor-page">
      <div className="editor-grid">
        <form action={formAction} className="editor panel">
          <input type="hidden" name="payload" value={JSON.stringify(input)} />
          {editing && <input type="hidden" name="id" value={initial!.id} />}

          <h2 className="editor-h">Template details</h2>
          <div className="field">
            <label htmlFor="t-title">Title *</label>
            <input
              id="t-title"
              className="input"
              value={meta.title}
              onChange={(e) => setMetaField("title", e.target.value)}
              placeholder="e.g., Cold outreach email"
            />
          </div>
          <div className="row-2">
            <div className="field">
              <label htmlFor="t-cat">Category</label>
              <select
                id="t-cat"
                className="select"
                value={meta.category}
                onChange={(e) => setMetaField("category", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="t-icon">Icon</label>
              <select
                id="t-icon"
                className="select"
                value={meta.icon}
                onChange={(e) => setMetaField("icon", e.target.value)}
              >
                {ICON_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="t-blurb">Short description</label>
            <input
              id="t-blurb"
              className="input"
              value={meta.blurb}
              onChange={(e) => setMetaField("blurb", e.target.value)}
              placeholder="One sentence about what this template makes."
            />
          </div>
          <div className="field">
            <label htmlFor="t-base">Base prompt *</label>
            <textarea
              id="t-base"
              className="textarea"
              value={meta.base_prompt}
              onChange={(e) => setMetaField("base_prompt", e.target.value)}
              placeholder={"# Role\nYou are a helpful assistant…"}
              rows={5}
            />
            <span className="helper">
              Lines starting with # render as muted comments in the preview.
            </span>
          </div>

          <h2 className="editor-h">
            Questions <span className="muted">({fields.length})</span>
          </h2>
          {fields.map((row) => (
            <div className="editor-item" key={row.key}>
              <div className="row-2">
                <div className="field">
                  <label>Label</label>
                  <input
                    className="input"
                    value={row.label}
                    onChange={(e) => updateField(row.key, { label: e.target.value })}
                    placeholder="What should we ask?"
                  />
                </div>
                <div className="field">
                  <label>Type</label>
                  <select
                    className="select"
                    value={row.type}
                    onChange={(e) =>
                      updateField(row.key, { type: e.target.value as FieldType })
                    }
                  >
                    <option value="text">Short text</option>
                    <option value="textarea">Long text</option>
                    <option value="select">Dropdown</option>
                    <option value="pills">Pills</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Prompt prefix</label>
                <input
                  className="input"
                  value={row.prefix}
                  onChange={(e) => updateField(row.key, { prefix: e.target.value })}
                  placeholder="Text inserted before the answer, e.g. '\n\n# Audience\n'"
                />
              </div>
              {(row.type === "select" || row.type === "pills") && (
                <div className="field">
                  <label>Options (comma-separated)</label>
                  <input
                    className="input"
                    value={row.options}
                    onChange={(e) => updateField(row.key, { options: e.target.value })}
                    placeholder="Friendly, Formal, Playful"
                  />
                </div>
              )}
              <div className="editor-item-foot">
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={row.required}
                    onChange={(e) => updateField(row.key, { required: e.target.checked })}
                  />
                  Required
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeField(row.key)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm add-btn" onClick={addField}>
            + Add question
          </button>

          <h2 className="editor-h">
            Checkboxes <span className="muted">({checks.length})</span>
          </h2>
          {checks.map((row) => (
            <div className="editor-item" key={row.key}>
              <div className="field">
                <label>Label</label>
                <input
                  className="input"
                  value={row.label}
                  onChange={(e) => updateCheck(row.key, { label: e.target.value })}
                  placeholder="e.g., Include examples"
                />
              </div>
              <div className="field">
                <label>Injected text (added when checked)</label>
                <textarea
                  className="textarea"
                  value={row.injected_text}
                  onChange={(e) => updateCheck(row.key, { injected_text: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="editor-item-foot">
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={row.default}
                    onChange={(e) => updateCheck(row.key, { default: e.target.checked })}
                  />
                  Checked by default
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeCheck(row.key)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm add-btn" onClick={addCheck}>
            + Add checkbox
          </button>

          {state.errors?.length ? (
            <ul className="editor-errors" role="alert">
              {state.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          ) : null}

          <SubmitRow editing={editing} />
        </form>

        <aside className="editor-preview panel">
          <h3>Live preview</h3>
          <pre>{preview || "Your assembled prompt will appear here as you build."}</pre>
        </aside>
      </div>
    </main>
  );
}

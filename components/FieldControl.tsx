"use client";

/* One field control, switched on type (text / textarea / select / pills).
 * Extracted from the builder so the classic Builder and notebook variable blocks
 * render inputs identically. Pure presentational: value in, onText(id, value) out. */

import type { Field } from "@/data/types";

export function FieldControl({
  field,
  value,
  onText,
  error,
}: {
  field: Field;
  value: string;
  onText: (id: string, value: string) => void;
  /** Inline validation message (e.g. a required field left blank). */
  error?: string;
}) {
  const label = (
    <label htmlFor={field.id}>
      {field.label}
      {field.required && <span className="req">*</span>}
    </label>
  );

  const invalid = error ? true : undefined;
  const describedBy = error ? `${field.id}-err` : undefined;
  // Error supersedes the helper line; otherwise show the helper if present.
  const foot = error ? (
    <span id={`${field.id}-err`} className="field-error" role="alert">
      {error}
    </span>
  ) : field.helper ? (
    <span className="helper">{field.helper}</span>
  ) : null;

  if (field.type === "text") {
    return (
      <div className="field">
        {label}
        <input
          id={field.id}
          className="input"
          value={value}
          placeholder={field.placeholder}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(e) => onText(field.id, e.target.value)}
        />
        {foot}
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
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(e) => onText(field.id, e.target.value)}
        />
        {foot}
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
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(e) => onText(field.id, e.target.value)}
        >
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {foot}
      </div>
    );
  }

  if (field.type === "pills") {
    return (
      <div className="field">
        {label}
        <div
          className="pills"
          role="group"
          aria-label={field.label}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        >
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
        {foot}
      </div>
    );
  }

  return null;
}

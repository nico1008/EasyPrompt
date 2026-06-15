"use client";

/* One field control, switched on type (text / textarea / select / pills).
 * Extracted from the builder so the classic Builder and notebook variable blocks
 * render inputs identically. Pure presentational: value in, onText(id, value) out. */

import type { Field } from "@/data/types";

export function FieldControl({
  field,
  value,
  onText,
}: {
  field: Field;
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

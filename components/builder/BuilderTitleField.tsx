import type { ChangeEvent } from "react";
import "./BuilderTitleField.css";

type BuilderKind = "prompt" | "template" | "workflow";

type BuilderTitleFieldProps = {
  kind: BuilderKind;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  className?: string;
};

const labels: Record<BuilderKind, string> = {
  prompt: "Prompt title",
  template: "Template title",
  workflow: "Workflow title",
};

export function BuilderTitleField({
  kind,
  value,
  onValueChange,
  placeholder,
  maxLength = 120,
  className,
}: BuilderTitleFieldProps) {
  const label = labels[kind];
  const classes = ["builder-title-field", `is-${kind}`, className].filter(Boolean).join(" ");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange(event.target.value);
  }

  return (
    <label className={classes}>
      <span className="builder-title-label">{label}</span>
      <input
        className="builder-title-input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={label}
        maxLength={maxLength}
        autoComplete="off"
        spellCheck
      />
    </label>
  );
}

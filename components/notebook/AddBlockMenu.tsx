"use client";

/* Insert-a-block menu for the notebook canvas. Sections (role/context/…/markdown)
 * and variable inputs (the Field kinds). Closes on outside-click / Escape, like
 * UserMenu. */

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { SECTION_PRESETS, PRESET_META } from "@/lib/blocks/defaults";
import type { BlockPreset } from "@/lib/blocks/types";
import type { Field } from "@/data/types";

export const PRESET_ICON: Record<BlockPreset, IconName> = {
  role: "teacher",
  context: "letter",
  task: "check",
  constraints: "review",
  examples: "lesson",
  output: "chart",
  markdown: "code",
};

const VAR_TYPES: { type: Field["type"]; label: string }[] = [
  { type: "text", label: "Short text" },
  { type: "textarea", label: "Long text" },
  { type: "select", label: "Dropdown" },
  { type: "pills", label: "Choice pills" },
];

export function AddBlockMenu({
  onAddSection,
  onAddVariable,
}: {
  onAddSection: (preset: BlockPreset) => void;
  onAddVariable: (type: Field["type"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="nb-add" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost nb-add-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="plus" size={16} strokeWidth={2.2} /> Add block
      </button>
      {open && (
        <div className="nb-add-menu" role="menu">
          <div className="nb-add-group">Sections</div>
          {SECTION_PRESETS.map((p) => (
            <button
              key={p}
              role="menuitem"
              type="button"
              className="nb-add-item"
              onClick={() => {
                onAddSection(p);
                setOpen(false);
              }}
            >
              <Icon name={PRESET_ICON[p]} size={16} />
              {PRESET_META[p].label}
            </button>
          ))}
          <div className="nb-add-group">Variable input</div>
          {VAR_TYPES.map((v) => (
            <button
              key={v.type}
              role="menuitem"
              type="button"
              className="nb-add-item"
              onClick={() => {
                onAddVariable(v.type);
                setOpen(false);
              }}
            >
              <Icon name="zap" size={16} />
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

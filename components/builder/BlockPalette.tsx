"use client";

/* The "Add block" command palette — a searchable, categorised, keyboard-driven
 * picker of every block type. Rendered as a native <dialog> (showModal) so it
 * escapes any overflow/stacking context and gets a real backdrop + focus trap
 * for free. Controlled by the parent (open + insert index live there). */

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { paletteEntries, PALETTE_CATEGORIES, type PaletteEntry } from "@/lib/blocks/defaults";

export function BlockPalette({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (entry: PaletteEntry) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const all = useMemo(() => paletteEntries(), []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? all.filter((e) => e.keywords.includes(s)) : all;
  }, [all, q]);

  // Drive the native dialog from the `open` prop.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      setQ("");
      setActive(0);
      d.showModal();
      // focus after the dialog is shown
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  // Keep the active index inside the filtered range.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const pick = (e: PaletteEntry) => {
    onInsert(e);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = filtered[active];
      if (sel) pick(sel);
    }
  };

  const groups = PALETTE_CATEGORIES.map((c) => ({
    ...c,
    items: filtered.filter((e) => e.category === c.id),
  })).filter((g) => g.items.length > 0);

  return (
    <dialog
      ref={dialogRef}
      className="pb-palette"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose(); // backdrop click
      }}
    >
      <div className="pb-palette-inner" onKeyDown={onKeyDown}>
        <div className="pb-palette-search">
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            type="text"
            value={q}
            placeholder="Search blocks…"
            aria-label="Search block types"
            role="combobox"
            aria-expanded
            aria-controls="pb-palette-listbox"
            aria-activedescendant={filtered[active] ? `pb-pe-${filtered[active].key}` : undefined}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
          />
          <kbd>esc</kbd>
        </div>

        <div className="pb-palette-list" role="listbox" id="pb-palette-listbox" aria-label="Block types">
          {groups.length === 0 && (
            <p className="pb-palette-none">No blocks match “{q.trim()}”.</p>
          )}
          {groups.map((g) => (
            <div key={g.id} className="pb-palette-group">
              <div className="pb-palette-cat">{g.label}</div>
              {g.items.map((e) => {
                const idx = filtered.indexOf(e);
                const isActive = idx === active;
                return (
                  <button
                    key={e.key}
                    id={`pb-pe-${e.key}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`pb-palette-item${isActive ? " active" : ""}`}
                    onMouseMove={() => setActive(idx)}
                    onClick={() => pick(e)}
                  >
                    <span className="pb-palette-ico">
                      <Icon name={e.icon} size={16} />
                    </span>
                    <span className="pb-palette-text">
                      <span className="pb-palette-label">{e.label}</span>
                      <span className="pb-palette-desc">{e.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
}

"use client";

/* One builder block. A compact header (drag grip, type chip, enable switch,
 * collapse, and an overflow "⋯" menu for duplicate / move / delete) over a body
 * that depends on the kind:
 *   section  → heading + markdown
 *   variable → field settings + the live FieldControl the reader fills
 *   note     → a private annotation (never added to the prompt)
 *   divider  → a structural rule, no body
 * Keyboard-first: the grip moves the block with Alt+↑/↓; every control is
 * labelled. */

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { Icon } from "@/components/Icon";
import { FieldControl } from "@/components/FieldControl";
import { PRESET_META, derivePrefix, blockTypeLabel, blockTypeIcon } from "@/lib/blocks/defaults";
import type { Block, NoteBlock, SectionBlock, VariableBlock } from "@/lib/blocks/types";
import type { Field } from "@/data/types";
import { usePopover } from "./usePopover";

export function BlockCard({
  block,
  index,
  total,
  dragOver,
  autoFocus,
  active,
  onChange,
  onToggleEnabled,
  onToggleCollapsed,
  onDuplicate,
  onDelete,
  onMove,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onFocused,
  onActivate,
}: {
  block: Block;
  index: number;
  total: number;
  dragOver: boolean;
  autoFocus: boolean;
  active: boolean;
  onChange: (next: Block) => void;
  onToggleEnabled: () => void;
  onToggleCollapsed: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onFocused: () => void;
  onActivate: () => void;
}) {
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const menu = usePopover();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (autoFocus && firstFieldRef.current) {
      firstFieldRef.current.focus();
      onFocused();
    }
  }, [autoFocus, onFocused]);

  // Reset the delete confirmation whenever the menu closes.
  useEffect(() => {
    if (!menu.open) setConfirmDelete(false);
  }, [menu.open]);

  const onGripKey = (e: KeyboardEvent) => {
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      onMove(e.key === "ArrowUp" ? -1 : 1);
    }
  };

  const typeLabel = blockTypeLabel(block);
  const typeIcon = blockTypeIcon(block);
  const hasBody = block.kind !== "divider";

  return (
    <div
      id={`pb-block-${block.id}`}
      className={`pb-block${block.enabled ? "" : " is-off"}${dragOver ? " drag-over" : ""}${active ? " is-active" : ""}${block.kind === "divider" ? " is-divider" : ""}`}
      onFocusCapture={onActivate}
      onDragOver={(e: DragEvent) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <div className="pb-block-head">
        <button
          type="button"
          className="pb-grip"
          aria-label={`Move ${typeLabel} block. Drag, or press Alt with the arrow keys.`}
          title="Drag to reorder (Alt+↑/↓)"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onKeyDown={onGripKey}
        >
          <Icon name="menu" size={15} />
        </button>

        <span className="pb-type">
          <Icon name={typeIcon} size={14} />
          {typeLabel}
        </span>

        <span className="pb-block-controls">
          <button
            type="button"
            role="switch"
            aria-checked={block.enabled}
            aria-label={block.enabled ? "Disable block (exclude from prompt)" : "Enable block"}
            title={block.enabled ? "Included — click to exclude" : "Excluded — click to include"}
            className={`pb-switch${block.enabled ? " on" : ""}`}
            onClick={onToggleEnabled}
          >
            <span className="pb-switch-dot" />
          </button>

          {hasBody && (
            <button
              type="button"
              className="pb-iconbtn"
              aria-label={block.collapsed ? "Expand block" : "Collapse block"}
              aria-expanded={!block.collapsed}
              title={block.collapsed ? "Expand" : "Collapse"}
              onClick={onToggleCollapsed}
            >
              <Icon name="chevron" size={16} className={block.collapsed ? "pb-rot" : undefined} />
            </button>
          )}

          <div className="pb-pop-wrap" ref={menu.ref}>
            <button
              type="button"
              className="pb-iconbtn"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menu.open}
              title="More"
              onClick={() => menu.setOpen((o) => !o)}
            >
              <Icon name="more" size={16} />
            </button>
            {menu.open && (
              <div className="pb-pop pb-pop-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="pb-menu-item"
                  onClick={() => {
                    onDuplicate();
                    menu.setOpen(false);
                  }}
                >
                  <Icon name="copy" size={15} /> Duplicate
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="pb-menu-item"
                  disabled={index === 0}
                  onClick={() => {
                    onMove(-1);
                    menu.setOpen(false);
                  }}
                >
                  <Icon name="chevron" size={15} className="pb-rot-up" /> Move up
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="pb-menu-item"
                  disabled={index === total - 1}
                  onClick={() => {
                    onMove(1);
                    menu.setOpen(false);
                  }}
                >
                  <Icon name="chevron" size={15} /> Move down
                </button>
                <div className="pb-menu-sep" />
                {confirmDelete ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="pb-menu-item pb-danger"
                    onClick={() => {
                      onDelete();
                      menu.setOpen(false);
                    }}
                  >
                    <Icon name="trash" size={15} /> Confirm delete
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="pb-menu-item pb-danger"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Icon name="trash" size={15} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </span>
      </div>

      {hasBody && !block.collapsed && (
        <div className="pb-block-body">
          {block.kind === "section" && (
            <SectionBody
              block={block}
              onChange={onChange}
              headingRef={firstFieldRef as React.RefObject<HTMLInputElement>}
            />
          )}
          {block.kind === "variable" && (
            <VariableBody
              block={block}
              onChange={onChange}
              labelRef={firstFieldRef as React.RefObject<HTMLInputElement>}
            />
          )}
          {block.kind === "note" && (
            <NoteBody
              block={block}
              onChange={onChange}
              textRef={firstFieldRef as React.RefObject<HTMLTextAreaElement>}
            />
          )}
        </div>
      )}

      {block.kind === "divider" && (
        <div className="pb-divider-body">
          <span className="pb-divider-rule" aria-hidden="true" />
          <span className="pb-divider-hint">Inserts a “---” rule</span>
        </div>
      )}
    </div>
  );
}

function SectionBody({
  block,
  onChange,
  headingRef,
}: {
  block: SectionBlock;
  onChange: (next: Block) => void;
  headingRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${block.id}-heading`}>Heading</label>
        <input
          id={`${block.id}-heading`}
          ref={headingRef}
          className="input"
          value={block.heading}
          placeholder="Optional — becomes a # heading"
          onChange={(e) => onChange({ ...block, heading: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`${block.id}-body`}>Content</label>
        <textarea
          id={`${block.id}-body`}
          className="textarea pb-body-area"
          value={block.body}
          placeholder={PRESET_META[block.preset].placeholder}
          onChange={(e) => onChange({ ...block, body: e.target.value })}
        />
      </div>
    </>
  );
}

function NoteBody({
  block,
  onChange,
  textRef,
}: {
  block: NoteBlock;
  onChange: (next: Block) => void;
  textRef: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <div className="field">
      <label htmlFor={`${block.id}-note`}>
        Note <span className="pb-note-tag">private</span>
      </label>
      <textarea
        id={`${block.id}-note`}
        ref={textRef}
        className="textarea pb-body-area"
        value={block.text}
        placeholder="A reminder for yourself — never added to the prompt."
        onChange={(e) => onChange({ ...block, text: e.target.value })}
      />
    </div>
  );
}

function VariableBody({
  block,
  onChange,
  labelRef,
}: {
  block: VariableBlock;
  onChange: (next: Block) => void;
  labelRef: React.RefObject<HTMLInputElement>;
}) {
  const field = block.field;
  const isChoice = field.type === "select" || field.type === "pills";

  const setField = (patch: Partial<Field>) => {
    onChange({ ...block, field: { ...field, ...patch } as Field });
  };

  const setLabel = (label: string) => {
    // Keep the prefix in sync so assembly emits `# {label}` for this input.
    onChange({ ...block, field: { ...field, label, prefix: derivePrefix(label) } as Field });
  };

  const setType = (type: Field["type"]) => {
    const common = {
      id: field.id,
      label: field.label,
      prefix: field.prefix,
      helper: field.helper,
      required: field.required,
    };
    let next: Field;
    if (type === "select" || type === "pills") {
      const options =
        field.type === "select" || field.type === "pills" ? field.options : ["Option A", "Option B"];
      next = { ...common, type, options };
    } else {
      next = { ...common, type };
    }
    onChange({ ...block, field: next });
  };

  return (
    <>
      <div className="pb-var-settings">
        <div className="field">
          <label htmlFor={`${block.id}-label`}>Label</label>
          <input
            id={`${block.id}-label`}
            ref={labelRef}
            className="input"
            value={field.label}
            placeholder="e.g. Audience"
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="field pb-type-field">
          <label htmlFor={`${block.id}-type`}>Type</label>
          <select
            id={`${block.id}-type`}
            className="select"
            value={field.type}
            onChange={(e) => setType(e.target.value as Field["type"])}
          >
            <option value="text">Short text</option>
            <option value="textarea">Long text</option>
            <option value="select">Dropdown</option>
            <option value="pills">Choice pills</option>
          </select>
        </div>
      </div>

      {isChoice && (
        <div className="field">
          <label htmlFor={`${block.id}-options`}>Options (comma-separated)</label>
          <input
            id={`${block.id}-options`}
            className="input"
            value={(field.options ?? []).join(", ")}
            placeholder="Option A, Option B, Option C"
            onChange={(e) =>
              setField({
                options: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      )}

      <div className="pb-var-value">
        <FieldControl field={field} value={block.value} onText={(_, value) => onChange({ ...block, value })} />
      </div>
    </>
  );
}

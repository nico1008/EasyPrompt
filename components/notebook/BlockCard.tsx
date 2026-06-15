"use client";

/* One notebook block: a header (drag handle, type, enable switch, collapse,
 * duplicate, move, delete) over a body. Section blocks edit a heading + markdown;
 * variable blocks edit a label/type/options and render the live FieldControl the
 * user fills. Keyboard-first: the grip moves the block with Alt+↑/↓, and explicit
 * move buttons mirror it for non-drag users. */

import { useEffect, useRef, type DragEvent, type KeyboardEvent } from "react";
import { Icon } from "@/components/Icon";
import { FieldControl } from "@/components/FieldControl";
import { PRESET_META, derivePrefix } from "@/lib/blocks/defaults";
import type { Block, SectionBlock, VariableBlock } from "@/lib/blocks/types";
import type { Field } from "@/data/types";
import { PRESET_ICON } from "./AddBlockMenu";

export function BlockCard({
  block,
  index,
  total,
  dragOver,
  autoFocus,
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
}: {
  block: Block;
  index: number;
  total: number;
  dragOver: boolean;
  autoFocus: boolean;
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
}) {
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && firstFieldRef.current) {
      firstFieldRef.current.focus();
      onFocused();
    }
  }, [autoFocus, onFocused]);

  const onGripKey = (e: KeyboardEvent) => {
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      onMove(e.key === "ArrowUp" ? -1 : 1);
    }
  };

  const typeLabel =
    block.kind === "variable" ? "Variable" : PRESET_META[block.preset].label;
  const typeIcon = block.kind === "variable" ? "zap" : PRESET_ICON[block.preset];

  return (
    <div
      className={`nb-block${block.enabled ? "" : " is-disabled"}${dragOver ? " drag-over" : ""}`}
      onDragOver={(e: DragEvent) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <div className="nb-block-head">
        <button
          type="button"
          className="nb-grip"
          aria-label={`Move ${typeLabel} block. Drag, or press Alt with the arrow keys.`}
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onKeyDown={onGripKey}
        >
          <Icon name="menu" size={16} />
        </button>

        <span className="nb-type">
          <Icon name={typeIcon} size={15} />
          {typeLabel}
        </span>

        <span className="nb-controls">
          <button
            type="button"
            role="switch"
            aria-checked={block.enabled}
            aria-label={block.enabled ? "Disable block" : "Enable block"}
            className={`nb-switch${block.enabled ? " on" : ""}`}
            onClick={onToggleEnabled}
          >
            <span className="nb-switch-dot" />
          </button>
          <button
            type="button"
            className="nb-iconbtn"
            aria-label={block.collapsed ? "Expand block" : "Collapse block"}
            aria-expanded={!block.collapsed}
            onClick={onToggleCollapsed}
          >
            <Icon name="chevron" size={16} className={block.collapsed ? "nb-rot" : undefined} />
          </button>
          <button
            type="button"
            className="nb-iconbtn"
            aria-label="Move block up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <Icon name="chevron" size={16} className="nb-rot-up" />
          </button>
          <button
            type="button"
            className="nb-iconbtn"
            aria-label="Move block down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <Icon name="chevron" size={16} />
          </button>
          <button type="button" className="nb-iconbtn" aria-label="Duplicate block" onClick={onDuplicate}>
            <Icon name="copy" size={15} />
          </button>
          <button
            type="button"
            className="nb-iconbtn nb-danger"
            aria-label="Delete block"
            onClick={onDelete}
          >
            <Icon name="trash" size={15} />
          </button>
        </span>
      </div>

      {!block.collapsed && (
        <div className="nb-block-body">
          {block.kind === "section" ? (
            <SectionBody block={block} onChange={onChange} headingRef={firstFieldRef as React.RefObject<HTMLInputElement>} />
          ) : (
            <VariableBody block={block} onChange={onChange} labelRef={firstFieldRef as React.RefObject<HTMLInputElement>} />
          )}
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
          className="textarea nb-body-area"
          value={block.body}
          placeholder={PRESET_META[block.preset].placeholder}
          onChange={(e) => onChange({ ...block, body: e.target.value })}
        />
      </div>
    </>
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
    // Carry only the props shared by every Field kind across a type change.
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
        field.type === "select" || field.type === "pills"
          ? field.options
          : ["Option A", "Option B"];
      next = { ...common, type, options };
    } else {
      next = { ...common, type };
    }
    onChange({ ...block, field: next });
  };

  return (
    <>
      <div className="nb-var-settings">
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
        <div className="field nb-type-field">
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

      <div className="nb-var-value">
        <FieldControl field={field} value={block.value} onText={(_, value) => onChange({ ...block, value })} />
      </div>
    </>
  );
}

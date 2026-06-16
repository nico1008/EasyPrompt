"use client";

/* Left rail: a live outline of the prompt's blocks. Click a row to scroll its
 * card into view and focus it. Reflects order and enabled/disabled state, and
 * carries an "Add block" affordance at the foot. */

import { Icon } from "@/components/Icon";
import { blockTypeLabel, blockTypeIcon } from "@/lib/blocks/defaults";
import type { Block } from "@/lib/blocks/types";

function outlineLabel(b: Block): string {
  if (b.kind === "section") return b.heading.trim() || blockTypeLabel(b);
  if (b.kind === "variable") return b.field.label.trim() || "Variable";
  if (b.kind === "note") return b.text.trim() ? `Note: ${b.text.trim().slice(0, 24)}` : "Note";
  return "Divider";
}

export function Outline({
  blocks,
  activeId,
  onJump,
  onAdd,
}: {
  blocks: Block[];
  activeId: string | null;
  onJump: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <nav className="pb-outline" aria-label="Prompt outline">
      <div className="pb-outline-head">Outline</div>
      {blocks.length === 0 ? (
        <p className="pb-outline-empty">No blocks yet.</p>
      ) : (
        <ol className="pb-outline-list">
          {blocks.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className={`pb-outline-item${activeId === b.id ? " active" : ""}${b.enabled ? "" : " off"}`}
                onClick={() => onJump(b.id)}
                title={b.enabled ? undefined : "Disabled — excluded from the prompt"}
              >
                <Icon name={blockTypeIcon(b)} size={14} />
                <span className="pb-outline-label">{outlineLabel(b)}</span>
                {!b.enabled && <span className="pb-outline-off" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ol>
      )}
      <button type="button" className="pb-outline-add" onClick={onAdd}>
        <Icon name="plus" size={14} strokeWidth={2.2} /> Add block
      </button>
    </nav>
  );
}

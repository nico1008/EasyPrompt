"use client";

/* The owned-items browser for My Library. A responsive card grid whose cards are
 * pure browse/select (one cohesive skeleton, accent-swapped per type — Template
 * light/indigo, Prompt dark/green). Selecting a card opens the detail panel where
 * every action lives; the card face stays clean. State is the selected key only —
 * the selected item is derived from the live props, so a server revalidation
 * (duplicate/delete) flows through and auto-closes the panel when the item is gone. */

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { objectMeta } from "@/lib/library/objectMeta";
import type { LibraryItem } from "@/lib/library/list";
import { LibraryDetailPanel } from "@/components/library/LibraryDetailPanel";

function LibraryCard({
  item,
  selected,
  dimmed,
  onSelect,
}: {
  item: LibraryItem;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const meta = objectMeta(item.objectType);
  return (
    <button
      type="button"
      className={`my-card-tile is-${item.objectType}${selected ? " selected" : ""}${
        dimmed ? " dimmed" : ""
      }`}
      aria-haspopup="dialog"
      aria-label={`${meta.label}: ${item.title}`}
      onClick={onSelect}
    >
      <div className="mct-bar">
        <span className="mct-glyph" aria-hidden="true">
          <Icon name={meta.icon} size={14} />
        </span>
        <span className="mct-type">{meta.label}</span>
        {item.status === "published" && (
          <span className="my-status my-status-published mct-status">Published</span>
        )}
      </div>
      <div className="mct-body">
        <h3 className="mct-title">{item.title}</h3>
      </div>
      <div className="mct-foot">
        <span className="mct-meta">{item.meta}</span>
      </div>
    </button>
  );
}

export function MyLibraryGrid({ items }: { items: LibraryItem[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = items.find((i) => i.key === selectedKey) ?? null;

  return (
    <>
      <div className={`my-grid${selectedKey ? " has-selection" : ""}`}>
        {items.map((it) => (
          <LibraryCard
            key={it.key}
            item={it}
            selected={it.key === selectedKey}
            dimmed={selectedKey !== null && it.key !== selectedKey}
            onSelect={() => setSelectedKey(it.key)}
          />
        ))}
      </div>
      {selected && (
        <LibraryDetailPanel
          key={selected.id}
          item={selected}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </>
  );
}

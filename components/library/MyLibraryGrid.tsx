"use client";

/* The owned-items browser for My Library. Cards navigate to the item's real page;
 * the secondary manage/settings control opens the item's action dialog. State is
 * only the active key, derived from live props so delete revalidation closes the
 * dialog when the item disappears. */

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { objectMeta } from "@/lib/library/objectMeta";
import type { LibraryItem } from "@/lib/library/list";
import { LibraryActionDialog } from "@/components/library/LibraryActionDialog";

function LibraryCard({
  item,
  onManage,
}: {
  item: LibraryItem;
  onManage: () => void;
}) {
  const meta = objectMeta(item.objectType);
  return (
    <article className={`my-card-tile is-${item.objectType}`}>
      <div className="mct-bar">
        <span className="mct-glyph" aria-hidden="true">
          <Icon name={meta.icon} size={14} />
        </span>
        <span className="mct-type">{meta.label}</span>
        <span className="mct-card-actions">
          {item.visibility === "public" && (
            <span className="my-visibility my-visibility-public mct-status">Public</span>
          )}
          <button
            type="button"
            className="mct-manage"
            aria-haspopup="dialog"
            aria-label={`Manage ${meta.label}: ${item.title}`}
            onClick={onManage}
          >
            <Icon name="wrench" size={14} />
          </button>
        </span>
      </div>
      <div className="mct-body">
        <h3 className="mct-title">
          <Link
            className="mct-link"
            href={item.primaryHref}
            aria-label={`${item.primaryLabel} ${meta.label}: ${item.title}`}
          >
            {item.title}
          </Link>
        </h3>
      </div>
      <div className="mct-foot">
        <span className="mct-meta">{item.meta}</span>
      </div>
    </article>
  );
}

export function MyLibraryGrid({ items }: { items: LibraryItem[] }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeItem = items.find((i) => i.key === activeKey) ?? null;

  return (
    <>
      <div className="my-grid">
        {items.map((it) => (
          <LibraryCard
            key={it.key}
            item={it}
            onManage={() => setActiveKey(it.key)}
          />
        ))}
      </div>
      {activeItem && (
        <LibraryActionDialog
          key={activeItem.key}
          item={activeItem}
          onClose={() => setActiveKey(null)}
        />
      )}
    </>
  );
}

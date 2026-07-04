"use client";

/* The owned-items browser for My Library. Cards navigate to the item's real page;
 * the secondary manage/settings control opens the item's action dialog. State is
 * only the active key, derived from live props so delete revalidation closes the
 * dialog when the item disappears. */

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
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
  const manage = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onManage();
  };

  return (
    <article className={`my-card-tile is-${item.objectType}`}>
      <div className="mct-bar">
        <span className="mct-glyph" aria-hidden="true">
          <Icon name={meta.icon} size={14} />
        </span>
        <h3 className="mct-title">
          <Link
            className="mct-link"
            href={item.primaryHref}
            aria-label={`${item.primaryLabel} ${meta.label}: ${item.title}`}
          >
            {item.title}
          </Link>
        </h3>
        <span className="mct-card-actions">
          {item.visibility === "public" && (
            <span className="my-visibility my-visibility-public mct-status">Public</span>
          )}
          <button
            type="button"
            className="mct-manage"
            aria-haspopup="dialog"
            aria-label={`Manage ${meta.label}: ${item.title}`}
            onClick={manage}
          >
            <Settings size={15} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </span>
      </div>
      <div className="mct-body">
        {item.preview && <p className="mct-blurb">{item.preview}</p>}
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

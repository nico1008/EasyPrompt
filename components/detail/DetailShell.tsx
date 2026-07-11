import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";

export function DetailShell({
  breadcrumbItems,
  creator,
  badge,
  title,
  description,
  metadata,
  side,
  preview,
  actions,
  context,
  actionsPlacement = "after-preview",
  footer,
}: {
  breadcrumbItems: BreadcrumbItem[];
  creator?: ReactNode;
  badge: string;
  title: string;
  description?: ReactNode;
  metadata?: ReactNode;
  side?: ReactNode;
  preview: ReactNode;
  actions?: ReactNode;
  context?: ReactNode;
  actionsPlacement?: "before-preview" | "after-preview";
  footer?: ReactNode;
}) {
  const actionsSlot = actions ? (
    <div className={`pd-actions-slot is-${actionsPlacement}`}>{actions}</div>
  ) : null;

  return (
    <main className="prompt-detail">
      <div className="pd-wrap">
        <div className="pd-topbar">
          <div className="pd-topbar-left">
            <Breadcrumbs items={breadcrumbItems} />
          </div>
          {creator && <div className="pd-topbar-meta">{creator}</div>}
        </div>

        {context}

        <section className="pd-head">
          <div className="pd-head-main">
            <span className="pd-tag">{badge}</span>
            <h1>{title}</h1>
            {description && <div className="pd-desc">{description}</div>}
            {metadata && <div className="pd-meta">{metadata}</div>}
          </div>
          {side && <div className="pd-head-side">{side}</div>}
        </section>

        {actionsPlacement === "before-preview" && actionsSlot}
        <div className="pd-preview">{preview}</div>
        {actionsPlacement === "after-preview" && actionsSlot}
        {footer}
      </div>
    </main>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";

export function DetailShell({
  backHref,
  backLabel,
  creator,
  badge,
  title,
  description,
  metadata,
  side,
  preview,
  actions,
  footer,
}: {
  backHref: string;
  backLabel: string;
  creator?: ReactNode;
  badge: string;
  title: string;
  description?: ReactNode;
  metadata?: ReactNode;
  side?: ReactNode;
  preview: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="prompt-detail">
      <div className="pd-wrap">
        <div className="pd-topbar">
          <div className="pd-topbar-left">
            <Link className="pd-back" href={backHref}>
              <Icon name="arrow-right" size={14} /> {backLabel}
            </Link>
          </div>
          {creator && <div className="pd-topbar-meta">{creator}</div>}
        </div>

        <section className="pd-head">
          <div className="pd-head-main">
            <span className="pd-tag">{badge}</span>
            <h1>{title}</h1>
            {description && <div className="pd-desc">{description}</div>}
            {metadata && <div className="pd-meta">{metadata}</div>}
          </div>
          {side && <div className="pd-head-side">{side}</div>}
        </section>

        <div className="pd-preview">{preview}</div>
        {actions}
        {footer}
      </div>
    </main>
  );
}

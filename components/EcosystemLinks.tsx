import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { EcosystemLink } from "@/data/ecosystem";

const ICONS = { template: "list", prompt: "code", workflow: "book" } as const;
const LABELS = { template: "Template", prompt: "Prompt", workflow: "Workflow" } as const;

export function EcosystemLinks({
  links,
  currentWorkflowSlug,
}: {
  links: EcosystemLink[];
  currentWorkflowSlug?: string;
}) {
  const visible = currentWorkflowSlug
    ? links.filter(
        (link) =>
          link.href !== `/workflows/${currentWorkflowSlug}` &&
          !link.href.startsWith(`/workflows/${currentWorkflowSlug}#`)
      )
    : links;
  if (visible.length === 0) return null;

  return (
    <section className="ecosystem-links" aria-labelledby="ecosystem-links-heading">
      <div className="ecosystem-links-head">
        <h2 id="ecosystem-links-heading">Continue with this work</h2>
        <p>Only direct, useful connections are shown.</p>
      </div>
      <div className="ecosystem-links-list">
        {visible.map((link) => (
          <Link className={`ecosystem-link is-${link.kind}`} href={link.href} key={`${link.kind}-${link.href}`}>
            <span className="ecosystem-link-icon" aria-hidden="true">
              <Icon name={ICONS[link.kind]} size={15} />
            </span>
            <span className="ecosystem-link-copy">
              <span>{LABELS[link.kind]}</span>
              <strong>{link.title}</strong>
              <small>{link.note}</small>
            </span>
            <Icon name="arrow-right" size={14} />
          </Link>
        ))}
      </div>
    </section>
  );
}

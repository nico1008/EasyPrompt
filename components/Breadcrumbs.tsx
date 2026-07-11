import Link from "next/link";
import { Icon } from "@/components/Icon";

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export function Breadcrumbs({ items, className = "" }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav className={`breadcrumbs${className ? ` ${className}` : ""}`} aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        <li className="breadcrumbs-home">
          <Link href="/" aria-label="Home">
            <Icon name="house" size={17} />
          </Link>
        </li>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li className="breadcrumbs-item" key={`${item.href ?? "current"}-${item.label}-${index}`}>
              <Icon className="breadcrumbs-separator" name="chevron" size={13} />
              {item.href && !current ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span className="breadcrumbs-current" aria-current={current ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

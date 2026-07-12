"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import "./CatalogControls.css";

export function CatalogControls({
  children,
  activeCount = 0,
  onClear,
}: {
  children: ReactNode;
  activeCount?: number;
  onClear?: () => void;
}) {
  return (
    <div className="catalog-controls" aria-label="Browse controls">
      {children}
      {activeCount > 0 && onClear && (
        <button type="button" className="catalog-clear" onClick={onClear}>
          Clear <span aria-hidden="true">{activeCount}</span>
        </button>
      )}
    </div>
  );
}

export function CatalogMenu({
  label,
  valueLabel,
  icon,
  activeCount = 0,
  children,
}: {
  label: string;
  valueLabel?: string;
  icon: IconName;
  activeCount?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLButtonElement>('[role^="menuitem"]')?.focus();
    });
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  function navigateMenu(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
    );
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (current + 1 + items.length) % items.length
          : (current - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div className={`catalog-menu${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`catalog-menu-trigger${activeCount > 0 ? " is-active" : ""}`}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        title={valueLabel ? `${label}: ${valueLabel}` : label}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={icon} size={15} />
        <span>{valueLabel ? `${label}: ${valueLabel}` : label}</span>
        {activeCount > 0 && <b>{activeCount}</b>}
        <Icon name="chevron" size={13} />
      </button>
      {open && (
        <div
          id={menuId}
          className="catalog-menu-popover"
          role="menu"
          aria-label={label}
          onKeyDown={navigateMenu}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
          }}
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest("button")) setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function CatalogMenuSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="catalog-menu-section">
      {label && <span className="catalog-menu-label">{label}</span>}
      {children}
    </div>
  );
}

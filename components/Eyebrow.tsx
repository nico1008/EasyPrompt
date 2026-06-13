import type { ReactNode } from "react";

/* Eyebrow + indigo dot (DESIGN_GUIDELINES §3 — every major section opens with one). */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="eyebrow">
      <span className="dot" />
      {children}
    </div>
  );
}

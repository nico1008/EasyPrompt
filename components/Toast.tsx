"use client";

/* The designed toast (a/payoff.html): dark pill, indigo pip, slide-in.
   Rendered when `show` is true. */
export function Toast({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="pip" />
      {message}
    </div>
  );
}

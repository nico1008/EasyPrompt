"use client";

import Link from "next/link";

/* Root error boundary. Renders inside the layout (Nav/Footer stay up), so it
 * only relies on globals.css classes — per-route CSS may not be loaded here. */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "60dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 28px",
      }}
    >
      <div
        className="panel"
        style={{ maxWidth: 480, padding: "40px 36px", textAlign: "center" }}
      >
        <p
          style={{
            font: "600 13px var(--font-mono)",
            letterSpacing: "0.06em",
            color: "var(--danger)",
            margin: "0 0 10px",
          }}
        >
          Something went wrong
        </p>
        <h1
          style={{
            font: "600 24px/1.2 var(--font-sans)",
            letterSpacing: "-0.02em",
            margin: "0 0 10px",
            color: "var(--fg-1)",
          }}
        >
          That wasn&apos;t supposed to happen.
        </h1>
        <p
          style={{
            font: "400 14px/1.55 var(--font-sans)",
            color: "var(--fg-2)",
            margin: "0 0 22px",
          }}
        >
          Your prompt inputs live in your browser, so nothing was lost. Try
          again, or head back to the library.
          {error.digest ? ` (Ref: ${error.digest})` : ""}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link className="btn btn-ghost" href="/prompts">
            Browse prompts
          </Link>
        </div>
      </div>
    </main>
  );
}

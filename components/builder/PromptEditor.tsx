"use client";

/* Dependency-free Markdown Prompt editor. Left pane: a title + a raw markdown
 * textarea. Right pane: the live preview in the shared dark code well (same
 * segment highlighting as every other assembled prompt — the "preview we already
 * have"). Anon-safe: it autosaves a local draft and offers Copy/Open-in while
 * logged out; Save-to-library prompts sign-in. Signed in, it writes a
 * source_kind='manual' Prompt (body = the markdown) and, on first save, routes to
 * the saved Prompt. Reused by /build/prompt (new) and /my/prompts/[id] (edit). */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { CodeWell } from "@/components/CodeWell";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import { copyText } from "@/lib/clipboard";
import { openInUrl, segmentMarkdown } from "@/lib/buildPrompt";
import { useLocalDraft } from "@/lib/drafts/useLocalDraft";
import {
  createManualPromptAction,
  updateManualPromptAction,
  type SaveState,
} from "@/lib/savedPrompts/actions";
import "./PromptEditor.css";

const EMPTY: SaveState = {};

function SaveSubmit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary btn-sm" type="submit" disabled={pending}>
      {pending ? "Saving…" : editing ? "Save changes" : "Save to library"}
    </button>
  );
}

export function PromptEditor({
  draftId = "new",
  initialName = "",
  initialBody = "",
  savedPromptId,
}: {
  draftId?: string;
  initialName?: string;
  initialBody?: string;
  savedPromptId?: string;
}) {
  const editing = Boolean(savedPromptId);
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [body, setBody] = useState(initialBody);
  const [auth, setAuth] = useState<"checking" | "anon" | "ready">("checking");
  const [toast, setToast] = useState<string | null>(null);

  const [state, formAction] = useActionState(
    editing ? updateManualPromptAction : createManualPromptAction,
    EMPTY
  );

  // Resolve auth client-side (page stays static/anon-safe).
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuth("anon");
      return;
    }
    let active = true;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (active) setAuth(data.session ? "ready" : "anon");
      });
    return () => {
      active = false;
    };
  }, []);

  // Local draft autosave (new prompts only — a saved row wins when editing).
  const { clear } = useLocalDraft<{ name: string; body: string }>({
    key: `easyprompt.promptdraft.${draftId}`,
    enabled: !editing,
    value: { name, body },
    hasContent: body.trim().length > 0,
    serialize: (v) => {
      const s = JSON.stringify(v);
      return s.length > 24_000 ? null : s;
    },
    parse: (raw) => {
      if (!raw) return null;
      try {
        const v = JSON.parse(raw);
        if (v && typeof v.body === "string") return { name: String(v.name ?? ""), body: v.body };
      } catch {
        /* ignore */
      }
      return null;
    },
    onRestore: (v) => {
      // Only restore if the user hasn't been handed seeded content.
      if (!initialBody) {
        setName((n) => n || v.name);
        setBody((b) => b || v.body);
      }
    },
  });

  // On a successful save: clear the draft, then route (create) or toast (edit).
  useEffect(() => {
    if (!state.ok) return;
    clear();
    if (!editing && state.savedId) {
      router.push(`/my/prompts/${state.savedId}`);
    } else {
      setToast("Changes saved");
      window.setTimeout(() => setToast(null), 2200);
    }
  }, [state.ok, state.savedId, editing, clear, router]);

  const segments = useMemo(() => segmentMarkdown(body), [body]);
  const tokens = Math.max(1, Math.ceil(body.length / 4));
  const kb = (new TextEncoder().encode(body).length / 1024).toFixed(1);
  const hasBody = body.trim().length > 0;

  const copy = useCallback(async () => {
    if (await copyText(body)) {
      setToast("Prompt copied to clipboard");
      window.setTimeout(() => setToast(null), 2200);
    }
  }, [body]);

  const loginNext =
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "/build/prompt";

  return (
    <main className="prompt-editor">
      <Toast show={Boolean(toast)} message={toast ?? ""} />

      <div className="pe-bar">
        <div className="pe-crumbs">
          <Link href="/build">Builder</Link>
          <span aria-hidden="true">/</span>
          <span>{editing ? "Edit prompt" : "New prompt"}</span>
        </div>
        <div className="pe-bar-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => void copy()} disabled={!hasBody}>
            <Icon name="copy" size={14} /> Copy
          </button>
          {auth === "ready" ? (
            <form action={formAction} className="pe-save-form">
              <input type="hidden" name="name" value={name || "Untitled prompt"} />
              <input type="hidden" name="body" value={body} />
              {editing && <input type="hidden" name="id" value={savedPromptId} />}
              <SaveSubmit editing={editing} />
            </form>
          ) : auth === "anon" && isSupabaseConfigured() ? (
            <Link
              className="btn btn-primary btn-sm"
              href={`/login?next=${encodeURIComponent(loginNext)}`}
            >
              Log in to save
            </Link>
          ) : null}
        </div>
      </div>

      {state.error && (
        <p className="pe-err" role="alert">
          {state.error}
        </p>
      )}

      <div className="pe-grid">
        <section className="pe-edit panel">
          <input
            className="pe-title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled prompt"
            aria-label="Prompt name"
            maxLength={120}
          />
          <textarea
            className="pe-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Write your prompt in markdown…\n\n# Role\nYou are a…\n\n# Task\n…`}
            aria-label="Prompt body (markdown)"
            spellCheck
          />
          <p className="pe-hint">
            Markdown supported. Lines starting with <code>#</code> render as muted headings in the
            preview.
          </p>
        </section>

        <section className="pe-preview">
          <CodeWell
            title={`${(name || "prompt").replace(/\s+/g, "-").toLowerCase()}.md`}
            segments={segments}
            tokens={tokens}
            kb={kb}
            empty={<span className="pe-empty">Your prompt will appear here as you type.</span>}
          />
          <div className="pe-openin">
            <a className="btn btn-ghost btn-sm" href={openInUrl("chatgpt", body)} target="_blank" rel="noopener noreferrer" aria-disabled={!hasBody}>
              Open in ChatGPT
            </a>
            <a className="btn btn-ghost btn-sm" href={openInUrl("claude", body)} target="_blank" rel="noopener noreferrer" aria-disabled={!hasBody}>
              Claude
            </a>
            <a className="btn btn-ghost btn-sm" href={openInUrl("gemini", body)} target="_blank" rel="noopener noreferrer">
              Gemini
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

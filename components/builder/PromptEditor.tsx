"use client";

/* Single-pane Markdown Prompt editor. One styled .md surface: a transparent
 * <textarea> stacked over a syntax-highlighted <pre> mirror with identical
 * metrics, so headings/lists/code/bold color live AS YOU TYPE and the caret never
 * drifts (the highlighted-textarea technique — react-simple-code-editor pattern,
 * hand-rolled, no dep). The editor grows with content and the page scrolls; the
 * action bar is sticky so Copy / Open-in / Save stay reachable with no layout
 * shift while typing. Anon-safe (local draft + Copy/Open-in logged out; Save
 * prompts sign-in). Reused by /build/prompt (new) and /my/prompts/[id] (manual). */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { AuthGatedButton, currentAuthNext } from "@/components/AuthGatedButton";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseAccountState } from "@/lib/supabase/useUser";
import { copyText } from "@/lib/clipboard";
import { openInUrl } from "@/lib/buildPrompt";
import { MarkdownEditorSurface } from "@/components/builder/MarkdownEditorSurface";
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
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { account } = useSupabaseAccountState();

  const [state, formAction] = useActionState(
    editing ? updateManualPromptAction : createManualPromptAction,
    EMPTY
  );

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

  const tokens = Math.max(1, Math.ceil(body.length / 4));
  const kb = (new TextEncoder().encode(body).length / 1024).toFixed(1);
  const hasBody = body.trim().length > 0;

  const copy = useCallback(async () => {
    if (await copyText(body)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }, [body]);

  const fileName = `${(name || "untitled").replace(/\s+/g, "-").toLowerCase()}.md`;
  const persistDraftNow = useCallback(() => {
    if (editing || typeof window === "undefined" || !hasBody) return;
    const raw = JSON.stringify({ name, body });
    if (raw.length <= 24_000) window.localStorage.setItem(`easyprompt.promptdraft.${draftId}`, raw);
  }, [body, draftId, editing, hasBody, name]);

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
          <button
            className={`btn btn-ghost btn-sm${copied ? " is-copied" : ""}`}
            onClick={() => void copy()}
            disabled={!hasBody}
          >
            <Icon name={copied ? "check" : "copy"} size={14} /> {copied ? "Copied!" : "Copy"}
          </button>
          {account ? (
            <form action={formAction} className="pe-save-form">
              <input type="hidden" name="name" value={name || "Untitled prompt"} />
              <input type="hidden" name="body" value={body} />
              {editing && <input type="hidden" name="id" value={savedPromptId} />}
              <SaveSubmit editing={editing} />
            </form>
          ) : isSupabaseConfigured() ? (
            <AuthGatedButton
              className="btn btn-primary btn-sm"
              disabled={!hasBody}
              next={() => currentAuthNext("/build/prompt")}
              prompt={{
                title: "Create an account to save this Prompt",
                body: "Save your Prompts and access them from My Library.",
                icon: "code",
                dismissLabel: "Keep editing",
              }}
              onBeforeAuthNavigate={persistDraftNow}
            >
              Save to library
            </AuthGatedButton>
          ) : null}
        </div>
      </div>

      {state.error && (
        <p className="pe-err" role="alert">
          {state.error}
        </p>
      )}

      <div className="pe-wrap">
        <input
          className="pe-title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Untitled prompt"
          aria-label="Prompt name"
          maxLength={120}
        />

        <div className="pe-openin" aria-label="Open this prompt in">
          <span className="pe-openin-label">Open in</span>
          <a className="md-open" href={openInUrl("chatgpt", body)} target="_blank" rel="noopener noreferrer" aria-disabled={!hasBody}>
            ChatGPT
          </a>
          <a className="md-open" href={openInUrl("claude", body)} target="_blank" rel="noopener noreferrer" aria-disabled={!hasBody}>
            Claude
          </a>
          <a className="md-open" href={openInUrl("gemini", body)} target="_blank" rel="noopener noreferrer">
            Gemini
          </a>
        </div>

        <MarkdownEditorSurface
          value={body}
          onChange={setBody}
          fileName={fileName}
          tokens={tokens}
          kb={kb}
          placeholder={"Write your prompt in markdown…\n\n# Role\nYou are a…\n\n# Task\n…"}
        />

        <p className="pe-hint">
          Markdown is highlighted live — <code>#</code> headings, <code>- </code> lists,{" "}
          <code>**bold**</code>, and <code>`code`</code>.
        </p>
      </div>
    </main>
  );
}

"use client";

/* Single-pane Markdown Prompt editor. One styled .md surface: a transparent
 * <textarea> stacked over a syntax-highlighted <pre> mirror with identical
 * metrics, so headings/lists/code/bold color live AS YOU TYPE and the caret never
 * drifts (the highlighted-textarea technique — react-simple-code-editor pattern,
 * hand-rolled, no dep). The editor grows with content and the page scrolls.
 * Actions sit directly below the markdown surface, matching published Prompt
 * detail pages. Anon-safe (local draft + Copy/Open-in logged out; Save prompts
 * sign-in). Reused by /build/prompt (new) and /my/prompts/[id] (manual). */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { AuthGatedButton, currentAuthNext } from "@/components/AuthGatedButton";
import { DetailActions } from "@/components/detail/DetailActions";
import {
  ProviderOpenActions,
  type ProviderOpenLinks,
} from "@/components/detail/ProviderOpenActions";
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

function SaveSubmit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-ghost btn-sm" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save"}
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
  const providerLinks: ProviderOpenLinks = {
    chatgpt: { href: openInUrl("chatgpt", body) },
    claude: { href: openInUrl("claude", body) },
    gemini: { href: openInUrl("gemini", body) },
  };
  const saveControl = account ? (
    <form action={formAction} className="pe-save-form">
      <input type="hidden" name="name" value={name || "Untitled prompt"} />
      <input type="hidden" name="body" value={body} />
      {editing && <input type="hidden" name="id" value={savedPromptId} />}
      <SaveSubmit />
    </form>
  ) : isSupabaseConfigured() ? (
    <AuthGatedButton
      className="btn btn-ghost btn-sm"
      disabled={!hasBody}
      next={() => currentAuthNext("/build/prompt")}
      prompt={{
        title: "Save this prompt",
        body: "Create an account to save and reuse.",
      }}
      onBeforeAuthNavigate={persistDraftNow}
    >
      Save
    </AuthGatedButton>
  ) : null;

  return (
    <main className="prompt-editor">
      <Toast show={Boolean(toast)} message={toast ?? ""} />
      <h1 className="sr-only">Prompt editor</h1>

      <div className="pe-wrap">
        <nav className="pe-nav" aria-label="Prompt editor navigation">
          <Link className="pd-back" href={editing ? "/my" : "/build"}>
            <Icon name="arrow-right" size={14} /> {editing ? "My Library" : "Builder"}
          </Link>
        </nav>

        <input
          className="pe-title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Untitled prompt"
          aria-label="Prompt name"
          maxLength={120}
        />

        <MarkdownEditorSurface
          value={body}
          onChange={setBody}
          fileName={fileName}
          tokens={tokens}
          kb={kb}
          placeholder={"Write your prompt in markdown…\n\n# Role\nYou are a…\n\n# Task\n…"}
        />

        <DetailActions
          primary={
            <button
              className="btn btn-primary btn-sm"
              onClick={() => void copy()}
              disabled={!hasBody}
            >
              <Icon name={copied ? "check" : "copy"} size={14} /> {copied ? "Copied" : "Copy"}
            </button>
          }
          secondary={saveControl}
          providers={<ProviderOpenActions links={providerLinks} disabled={!hasBody} />}
        />

        {state.error && (
          <p className="pe-err" role="alert">
            {state.error}
          </p>
        )}

        <p className="pe-hint">
          Markdown is highlighted live — <code>#</code> headings, <code>- </code> lists,{" "}
          <code>**bold**</code>, and <code>`code`</code>.
        </p>
      </div>
    </main>
  );
}

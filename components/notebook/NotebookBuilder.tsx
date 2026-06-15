"use client";

/* The block-based notebook builder. A reorderable canvas of prompt-section blocks
 * on the left, a live assembled-prompt preview (shared CodeWell + running token
 * estimate) on the right. Reuses buildPromptFromBlocks (smart exclusion), the
 * FieldControl for variable inputs, and the generalized draft system for
 * anonymous autosave. Logged-in users save to prompt_notebooks via server
 * actions; anonymous work persists in localStorage.
 *
 * Reorder is native HTML5 DnD (grip handle) plus keyboard (Alt+↑/↓ and the
 * explicit move buttons in each block) — no drag-drop dependency. */

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildPromptFromBlocks, openInUrl } from "@/lib/buildPrompt";
import type { Block, BlockDoc, BlockPreset } from "@/lib/blocks/types";
import { newSectionBlock, newVariableBlock, newBlockId } from "@/lib/blocks/defaults";
import { useNotebookDraft } from "@/lib/drafts/useNotebookDraft";
import {
  createNotebookAction,
  updateNotebookAction,
  type NotebookSaveState,
} from "@/lib/notebooks/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { Eyebrow } from "@/components/Eyebrow";
import { Toast } from "@/components/Toast";
import { CodeWell } from "@/components/CodeWell";
import { BlockCard } from "./BlockCard";
import { AddBlockMenu } from "./AddBlockMenu";
import type { Field } from "@/data/types";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function cloneBlock(b: Block): Block {
  if (b.kind === "variable") {
    return { ...b, id: newBlockId(), field: { ...b.field, id: newBlockId() } };
  }
  return { ...b, id: newBlockId() };
}

export function NotebookBuilder({
  initialDoc,
  notebookId,
  draftId = "new",
}: {
  initialDoc: BlockDoc;
  /** Set in edit mode (/my/notebooks/[id]) — save updates this row, draft is off. */
  notebookId?: string;
  /** localStorage draft key id when in create mode (e.g. "new" or "new-from-slug"). */
  draftId?: string;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState<BlockDoc>(initialDoc);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  const built = useMemo(() => buildPromptFromBlocks(doc), [doc]);

  /* Anonymous autosave — off in edit mode (the saved row is the source of truth). */
  const { clear: clearDraft } = useNotebookDraft({
    notebookId: notebookId ?? draftId,
    enabled: notebookId === undefined,
    doc,
    hasContent: built.answered > 0 || doc.title.trim().length > 0,
    onRestore: setDoc,
  });

  /* ---- block mutations ---- */
  const patchBlock = useCallback((id: string, next: Block) => {
    setDoc((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? next : b)) }));
  }, []);

  const addSection = useCallback((preset: BlockPreset) => {
    const b = newSectionBlock(preset);
    setDoc((d) => ({ ...d, blocks: [...d.blocks, b] }));
    setFocusId(b.id);
  }, []);

  const addVariable = useCallback((type: Field["type"]) => {
    const b = newVariableBlock(type);
    setDoc((d) => ({ ...d, blocks: [...d.blocks, b] }));
    setFocusId(b.id);
  }, []);

  const duplicate = useCallback((id: string) => {
    setDoc((d) => {
      const i = d.blocks.findIndex((b) => b.id === id);
      if (i < 0) return d;
      const copy = cloneBlock(d.blocks[i]);
      const blocks = [...d.blocks];
      blocks.splice(i + 1, 0, copy);
      setFocusId(copy.id);
      return { ...d, blocks };
    });
  }, []);

  const remove = useCallback((id: string) => {
    setDoc((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
  }, []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setDoc((d) => {
      const i = d.blocks.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.blocks.length) return d;
      const blocks = [...d.blocks];
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...d, blocks };
    });
  }, []);

  const reorder = useCallback((from: number, to: number) => {
    setDoc((d) => {
      if (from === to || from < 0 || to < 0) return d;
      const blocks = [...d.blocks];
      const [moved] = blocks.splice(from, 1);
      blocks.splice(to, 0, moved);
      return { ...d, blocks };
    });
  }, []);

  const toggleEnabled = useCallback((id: string) => {
    setDoc((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)),
    }));
  }, []);

  const toggleCollapsed = useCallback((id: string) => {
    setDoc((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === id ? { ...b, collapsed: !b.collapsed } : b)),
    }));
  }, []);

  /* ---- preview actions ---- */
  const flashToast = useCallback(() => {
    setToast(true);
    window.setTimeout(() => setToast(false), 2400);
  }, []);

  const copy = useCallback(async () => {
    const ok = await copyText(built.text);
    if (ok) flashToast();
  }, [built.text, flashToast]);

  const download = useCallback(() => {
    const blob = new Blob([built.text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(doc.title || "notebook").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [built.text, doc.title]);

  return (
    <main className="notebook-page">
      <Toast show={toast} message="Prompt copied to clipboard" />
      <div className="nb">
        <div className="nb-top">
          <div>
            <Eyebrow>Builder</Eyebrow>
            <input
              className="nb-title-input"
              value={doc.title}
              placeholder="Untitled notebook"
              aria-label="Notebook title"
              maxLength={120}
              onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))}
            />
          </div>
          <Link className="btn btn-ghost btn-sm" href="/prompts">
            Browse templates →
          </Link>
        </div>

        <div className="nb-grid">
          {/* Canvas */}
          <div className="nb-canvas">
            {doc.blocks.length === 0 && (
              <div className="nb-empty panel">
                <p>An empty canvas. Add your first block to start composing.</p>
              </div>
            )}

            {doc.blocks.map((b, i) => (
              <BlockCard
                key={b.id}
                block={b}
                index={i}
                total={doc.blocks.length}
                dragOver={overIndex === i && dragIndex !== null && dragIndex !== i}
                autoFocus={focusId === b.id}
                onChange={(next) => patchBlock(b.id, next)}
                onToggleEnabled={() => toggleEnabled(b.id)}
                onToggleCollapsed={() => toggleCollapsed(b.id)}
                onDuplicate={() => duplicate(b.id)}
                onDelete={() => remove(b.id)}
                onMove={(dir) => move(b.id, dir)}
                onDragStart={() => setDragIndex(i)}
                onDragOver={() => setOverIndex(i)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDrop={() => {
                  if (dragIndex !== null) reorder(dragIndex, i);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onFocused={() => setFocusId(null)}
              />
            ))}

            <div className="nb-add-row" ref={addRef}>
              <AddBlockMenu onAddSection={addSection} onAddVariable={addVariable} />
            </div>
          </div>

          {/* Live preview + save */}
          <aside className="nb-side">
            <div className="nb-preview">
              <CodeWell
                title={`${doc.title || "notebook"}.md`}
                segments={built.segments}
                tokens={built.tokens}
                kb={built.kb}
                empty={
                  <span className="nb-preview-empty">
                    Your prompt appears here as you fill in blocks.
                  </span>
                }
                footer={
                  <>
                    <span className="label">{built.answered} of {built.total} active</span>
                    <span className="spacer" />
                    <button className="btn btn-on-dark btn-sm" onClick={download} disabled={!built.text}>
                      <Icon name="download" size={13} strokeWidth={2} />
                      Download
                    </button>
                    <button className="btn btn-on-dark-primary btn-sm" onClick={() => void copy()} disabled={!built.text}>
                      <Icon name="copy" size={13} strokeWidth={2} />
                      Copy
                    </button>
                  </>
                }
              />

              <div className="nb-openin panel">
                <h3>Open in</h3>
                <div className="open-in">
                  <a href={openInUrl("chatgpt", built.text)} target="_blank" rel="noopener noreferrer">
                    <span className="lg gpt">G</span>ChatGPT<span className="arrow">→</span>
                  </a>
                  <a href={openInUrl("claude", built.text)} target="_blank" rel="noopener noreferrer">
                    <span className="lg cl">C</span>Claude<span className="arrow">→</span>
                  </a>
                  <a href={openInUrl("gemini", built.text)} target="_blank" rel="noopener noreferrer">
                    <span className="lg gem">★</span>Gemini<span className="arrow">→</span>
                  </a>
                </div>
              </div>

              <SaveNotebook
                notebookId={notebookId}
                name={doc.title}
                doc={doc}
                onSaved={clearDraft}
                onCreated={(id) => router.push(`/my/notebooks/${id}`)}
              />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ---- Save control: mirrors SavePromptButton (client auth hint + server action) ---- */
const EMPTY_SAVE: NotebookSaveState = {};

function SaveSubmit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? "Saving…" : editing ? "Update notebook" : "Save notebook"}
    </button>
  );
}

function SaveNotebook({
  notebookId,
  name,
  doc,
  onSaved,
  onCreated,
}: {
  notebookId?: string;
  name: string;
  doc: BlockDoc;
  onSaved: () => void;
  onCreated: (id: string) => void;
}) {
  const editing = Boolean(notebookId);
  const [state, formAction] = useActionState(
    editing ? updateNotebookAction : createNotebookAction,
    EMPTY_SAVE
  );
  const [auth, setAuth] = useState<"checking" | "anon" | "ready">("checking");

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
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

  useEffect(() => {
    if (state.ok) {
      onSaved();
      if (!editing && state.savedId) onCreated(state.savedId);
    }
  }, [state.ok, state.savedId, editing, onSaved, onCreated]);

  if (!isSupabaseConfigured() || auth === "checking") return null;

  if (auth === "anon") {
    const next =
      typeof window !== "undefined" ? window.location.pathname + window.location.search : "/build";
    return (
      <div className="nb-save panel">
        <p className="nb-save-hint">Saving keeps this notebook in your account, on any device.</p>
        <Link className="btn btn-ink" href={`/login?next=${encodeURIComponent(next)}`}>
          Log in to save
        </Link>
      </div>
    );
  }

  if (editing && state.ok) {
    return (
      <div className="nb-save panel nb-save-done" role="status">
        <span className="nb-save-ok">Saved ✓</span>
        <Link className="nb-save-view" href="/my/notebooks">
          All notebooks →
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="nb-save panel">
      <input type="hidden" name="doc" value={JSON.stringify(doc)} />
      <input type="hidden" name="name" value={name} />
      {editing && <input type="hidden" name="id" value={notebookId} />}
      <SaveSubmit editing={editing} />
      {state.error && (
        <p className="nb-save-err" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

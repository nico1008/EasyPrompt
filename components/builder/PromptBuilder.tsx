"use client";

/* The block-based prompt builder. Three panes — a left outline rail, a center
 * block canvas, and a right inspector (live preview + prompt health) — under a
 * top toolbar (title, save state, history/share/export/copy). Reuses
 * buildPromptFromBlocks (smart exclusion), analyzeDoc (health), the shared
 * CodeWell, FieldControl, and the generalized draft system for anonymous
 * autosave. Logged-in users save to prompt_notebooks via server actions. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildPromptFromBlocks, openInUrl } from "@/lib/buildPrompt";
import { analyzeDoc, type HealthStatus } from "@/lib/blocks/health";
import type { Block, BlockDoc } from "@/lib/blocks/types";
import { newBlockId } from "@/lib/blocks/defaults";
import { useNotebookDraft } from "@/lib/drafts/useNotebookDraft";
import { notebookDraftKey, serializeNotebookDraft } from "@/lib/drafts/notebookDraft";
import {
  createNotebookAction,
  updateNotebookAction,
  setNotebookShareAction,
  type NotebookSaveState,
  type ShareState,
} from "@/lib/notebooks/actions";
import {
  listVersionsAction,
  restoreVersionAction,
  snapshotNotebookAction,
  type RestoreState,
  type VersionSaveState,
} from "@/lib/notebooks/versions/actions";
import type { NotebookVersion } from "@/lib/notebooks/versions/repo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseAccountState } from "@/lib/supabase/useUser";
import { Icon } from "@/components/Icon";
import { Eyebrow } from "@/components/Eyebrow";
import { Toast } from "@/components/Toast";
import { CodeWell } from "@/components/CodeWell";
import { AuthGatedButton, currentAuthNext } from "@/components/AuthGatedButton";
import { BlockCard } from "./BlockCard";
import { Outline } from "./Outline";
import { BlockPalette } from "./BlockPalette";
import { usePopover } from "./usePopover";
import type { PaletteEntry } from "@/lib/blocks/defaults";

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

export function PromptBuilder({
  initialDoc,
  notebookId,
  draftId = "new",
  initialShareSlug = null,
  initialVisibility = "private",
}: {
  initialDoc: BlockDoc;
  notebookId?: string;
  draftId?: string;
  /** Retained share slug when editing a saved prompt. Active only when public. */
  initialShareSlug?: string | null;
  initialVisibility?: "private" | "public";
}) {
  const router = useRouter();
  const [doc, setDoc] = useState<BlockDoc>(initialDoc);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Narrow-screen view switch (the panes can't sit side-by-side under ~860px).
  const [mobileView, setMobileView] = useState<"outline" | "build" | "preview">("build");
  const insertIndexRef = useRef<number>(0);
  // Save status (visibility of system status). New notebooks: the autosave-draft
  // outcome. Existing notebooks: dirty/saved vs the last save (snapshot below).
  const [draftStatus, setDraftStatus] = useState<"idle" | "saved" | "too-big">("idle");
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialDoc));
  const docRef = useRef(doc);
  docRef.current = doc;

  const built = useMemo(() => buildPromptFromBlocks(doc), [doc]);
  const health = useMemo(() => analyzeDoc(doc, built), [doc, built]);

  /* Anonymous autosave — off in edit mode (the saved row is the source of truth). */
  const { clear: clearDraft } = useNotebookDraft({
    notebookId: notebookId ?? draftId,
    enabled: notebookId === undefined,
    doc,
    hasContent: built.answered > 0 || doc.title.trim().length > 0,
    onRestore: setDoc,
    onStatus: setDraftStatus,
  });

  // On a successful save, clear the draft and reset the dirty baseline.
  const markSaved = useCallback(() => {
    clearDraft();
    setSavedSnapshot(JSON.stringify(docRef.current));
  }, [clearDraft]);

  const dirty = notebookId !== undefined && JSON.stringify(doc) !== savedSnapshot;
  const tooBig = notebookId === undefined && draftStatus === "too-big";
  const saveLabel =
    notebookId !== undefined
      ? dirty
        ? "Unsaved changes"
        : "Saved"
      : tooBig
        ? "Too long to autosave — save it to keep it"
        : draftStatus === "saved"
          ? "Draft saved"
          : null;

  /* ---- block mutations ---- */
  const patchBlock = useCallback((id: string, next: Block) => {
    setDoc((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? next : b)) }));
  }, []);

  const openPalette = useCallback((index: number) => {
    insertIndexRef.current = index;
    setPaletteOpen(true);
  }, []);

  const insertEntry = useCallback((entry: PaletteEntry) => {
    const block = entry.make();
    setDoc((d) => {
      const at = Math.min(Math.max(insertIndexRef.current, 0), d.blocks.length);
      const blocks = [...d.blocks];
      blocks.splice(at, 0, block);
      return { ...d, blocks };
    });
    setFocusId(block.id);
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
    setDoc((d) => {
      const i = d.blocks.findIndex((b) => b.id === id);
      const blocks = d.blocks.filter((b) => b.id !== id);
      const neighbor = blocks[i] ?? blocks[i - 1];
      if (neighbor) setActiveId(neighbor.id);
      return { ...d, blocks };
    });
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

  const jumpTo = useCallback((id: string) => {
    setActiveId(id);
    // On narrow screens the canvas may be hidden behind the view switch — show it
    // first, then scroll once it's laid out (rAF). Harmless on desktop.
    setMobileView("build");
    requestAnimationFrame(() => {
      document.getElementById(`pb-block-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  /* ---- preview actions ---- */
  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const copy = useCallback(async () => {
    const ok = await copyText(built.text);
    if (ok) flashToast("Prompt copied to clipboard");
  }, [built.text, flashToast]);

  const download = useCallback(() => {
    const blob = new Blob([built.text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(doc.title || "prompt").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [built.text, doc.title]);

  const persistDraftNow = useCallback(() => {
    if (notebookId !== undefined || typeof window === "undefined") return;
    if (built.answered === 0 && doc.title.trim().length === 0) return;
    const serialized = serializeNotebookDraft(doc);
    if (serialized) window.localStorage.setItem(notebookDraftKey(draftId), serialized);
  }, [built.answered, doc, draftId, notebookId]);

  return (
    <main className="pbuilder">
      <Toast show={Boolean(toast)} message={toast} />

      {/* ---- top toolbar ---- */}
      <header className="pb-toolbar">
        <div className="pb-toolbar-title">
          <Eyebrow>Template builder</Eyebrow>
          <input
            className="pb-title-input"
            value={doc.title}
            placeholder="Untitled template"
            aria-label="Template title"
            maxLength={120}
            onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))}
          />
        </div>
        <div className="pb-toolbar-actions">
          {saveLabel && (
            <span className={`pb-savestate${tooBig ? " alert" : ""}`} role="status">
              {saveLabel}
            </span>
          )}
          {notebookId && (
            <HistoryControl
              notebookId={notebookId}
              name={doc.title}
              doc={doc}
              onRestore={(restored) => {
                setDoc(restored);
                flashToast("Version restored");
              }}
            />
          )}
          {notebookId && (
            <ShareControl
              notebookId={notebookId}
              initialSlug={initialShareSlug}
              initialVisibility={initialVisibility}
            />
          )}
          <ExportMenu text={built.text} onDownload={download} />
          <SaveControl
            notebookId={notebookId}
            name={doc.title}
            doc={doc}
            onSaved={markSaved}
            onCreated={(id) => router.push(`/my/notebooks/${id}`)}
            onAuthGateNavigate={persistDraftNow}
          />
          {/* Copy is the single primary action (the prompt → clipboard payoff): it
              alone is indigo, and sits in the rightmost/strongest position. */}
          <button className="btn btn-primary btn-sm" onClick={() => void copy()} disabled={!built.text}>
            <Icon name="copy" size={14} strokeWidth={2} /> Copy
          </button>
        </div>
      </header>

      {/* ---- narrow-screen view switch (≤860px; hidden on desktop) ---- */}
      <div className="pb-viewtoggle" role="tablist" aria-label="Builder view">
        {(["outline", "build", "preview"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={mobileView === v}
            className={`pb-viewtab${mobileView === v ? " on" : ""}`}
            onClick={() => setMobileView(v)}
          >
            {v === "outline" ? "Outline" : v === "build" ? "Build" : "Preview"}
          </button>
        ))}
      </div>

      {/* ---- 3-pane workspace ---- */}
      <div className={`pb-grid m-${mobileView}`}>
        <Outline
          blocks={doc.blocks}
          activeId={activeId}
          onJump={jumpTo}
          onAdd={() => openPalette(doc.blocks.length)}
        />

        <div className="pb-canvas">
          {doc.blocks.length === 0 ? (
            <div className="pb-empty panel">
              <Icon name="plus" size={20} />
              <h2>Build a reusable template, block by block</h2>
              <p>Add the parts — a role, an objective, context, examples, and your own variables — and reuse it to generate a prompt whenever you need one. The preview on the right shows what it produces.</p>
              <button className="btn btn-primary btn-sm" onClick={() => openPalette(0)}>
                <Icon name="plus" size={14} strokeWidth={2.2} /> Add your first block
              </button>
              <p className="pb-empty-alt">
                Want a head start? <Link href="/templates">Browse ready-made templates →</Link>
              </p>
            </div>
          ) : (
            doc.blocks.map((b, i) => (
              <div className="pb-block-slot" key={b.id}>
                <BlockCard
                  block={b}
                  index={i}
                  total={doc.blocks.length}
                  dragOver={overIndex === i && dragIndex !== null && dragIndex !== i}
                  autoFocus={focusId === b.id}
                  active={activeId === b.id}
                  onChange={(next) => patchBlock(b.id, next)}
                  onToggleEnabled={() => toggleEnabled(b.id)}
                  onToggleCollapsed={() => toggleCollapsed(b.id)}
                  onDuplicate={() => duplicate(b.id)}
                  onDelete={() => remove(b.id)}
                  onMove={(dir) => move(b.id, dir)}
                  onActivate={() => setActiveId(b.id)}
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
                <button
                  type="button"
                  className="pb-insert"
                  aria-label="Add a block here"
                  onClick={() => openPalette(i + 1)}
                >
                  <span className="pb-insert-line" />
                  <span className="pb-insert-plus">
                    <Icon name="plus" size={14} strokeWidth={2.2} />
                  </span>
                  <span className="pb-insert-line" />
                </button>
              </div>
            ))
          )}

          {doc.blocks.length > 0 && (
            <button type="button" className="pb-add-btn" onClick={() => openPalette(doc.blocks.length)}>
              <Icon name="plus" size={16} strokeWidth={2.2} /> Add block
            </button>
          )}
        </div>

        {/* ---- inspector: preview + health ---- */}
        <aside className="pb-inspector">
          <CodeWell
            title={`${(doc.title || "prompt").replace(/\s+/g, "-").toLowerCase()}.md`}
            segments={built.segments}
            tokens={built.tokens}
            kb={built.kb}
            empty={<span className="pb-preview-empty">Your prompt appears here as you add blocks.</span>}
            footer={<span className="pb-foot-count">{built.answered} of {built.total} active</span>}
          />

          <PromptHealth health={health} />
        </aside>
      </div>

      <BlockPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onInsert={insertEntry} />
    </main>
  );
}

/* --------------------------- prompt health panel -------------------------- */
const HEALTH_STATUS: Record<HealthStatus, string> = {
  empty: "Empty",
  "needs-objective": "Add an objective",
  ready: "Ready",
};

function PromptHealth({ health }: { health: ReturnType<typeof analyzeDoc> }) {
  return (
    <div className="pb-health panel">
      <div className="pb-health-head">
        <span className="pb-health-title">Prompt health</span>
        <span className={`pb-health-status ${health.status}`} role="status">
          {HEALTH_STATUS[health.status]}
        </span>
      </div>

      <div className="pb-checks-head">
        Suggested sections <span>· optional, a focused prompt can be short</span>
      </div>
      <ul className="pb-checks">
        {health.checks.map((c) => (
          <li key={c.id} className={c.done ? "done" : ""}>
            <Icon name={c.done ? "check" : "minus"} size={14} />
            {c.label}
          </li>
        ))}
      </ul>

      {health.warnings.length > 0 && (
        <ul className="pb-warnings">
          {health.warnings.map((w) => (
            <li key={w.id} className={`pb-warn ${w.severity}`}>
              <Icon name={w.severity === "warn" ? "review" : "letter"} size={14} />
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------- export menu ------------------------------ */
function ExportMenu({ text, onDownload }: { text: string; onDownload: () => void }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="pb-pop-wrap" ref={ref}>
      <button
        className="btn btn-ghost btn-sm"
        disabled={!text}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="download" size={14} /> Export
        <Icon name="chevron" size={12} />
      </button>
      {open && (
        <div className="pb-pop pb-pop-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="pb-menu-item"
            onClick={() => {
              onDownload();
              setOpen(false);
            }}
          >
            <Icon name="download" size={15} /> Download .md
          </button>
          <div className="pb-menu-sep" />
          <a role="menuitem" className="pb-menu-item" href={openInUrl("chatgpt", text)} target="_blank" rel="noopener noreferrer">
            <span className="pb-lg gpt">G</span> Open in ChatGPT
          </a>
          <a role="menuitem" className="pb-menu-item" href={openInUrl("claude", text)} target="_blank" rel="noopener noreferrer">
            <span className="pb-lg cl">C</span> Open in Claude
          </a>
          <a role="menuitem" className="pb-menu-item" href={openInUrl("gemini", text)} target="_blank" rel="noopener noreferrer">
            <span className="pb-lg gem">★</span> Open in Gemini
          </a>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- save control ----------------------------- */
const EMPTY_SAVE: NotebookSaveState = {};

function SaveSubmit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  // Secondary (dark) so it doesn't compete with the indigo Copy primary.
  return (
    <button className="btn btn-ink btn-sm" type="submit" disabled={pending}>
      {pending ? "Saving…" : editing ? "Save" : "Save template"}
    </button>
  );
}

function SaveControl({
  notebookId,
  name,
  doc,
  onSaved,
  onCreated,
  onAuthGateNavigate,
}: {
  notebookId?: string;
  name: string;
  doc: BlockDoc;
  onSaved: () => void;
  onCreated: (id: string) => void;
  onAuthGateNavigate: () => void;
}) {
  const editing = Boolean(notebookId);
  const [state, formAction] = useActionState(editing ? updateNotebookAction : createNotebookAction, EMPTY_SAVE);
  const { account } = useSupabaseAccountState();

  useEffect(() => {
    if (state.ok) {
      onSaved();
      if (!editing && state.savedId) onCreated(state.savedId);
    }
  }, [state.ok, state.savedId, editing, onSaved, onCreated]);

  if (!isSupabaseConfigured()) return null;

  if (!account) {
    return (
      <AuthGatedButton
        className="btn btn-ink btn-sm"
        next={() => currentAuthNext("/build")}
        prompt={{
          title: "Save this Template",
          body: "Create a free account to keep it in your library and come back to it anytime.",
          icon: "bookmark",
          dismissLabel: "Continue without saving",
        }}
        onBeforeAuthNavigate={onAuthGateNavigate}
      >
        {editing ? "Save" : "Save template"}
      </AuthGatedButton>
    );
  }

  if (editing && state.ok) {
    return <span className="pb-saved" role="status">Saved ✓</span>;
  }

  return (
    <form action={formAction} className="pb-save-form">
      <input type="hidden" name="doc" value={JSON.stringify(doc)} />
      <input type="hidden" name="name" value={name} />
      {editing && <input type="hidden" name="id" value={notebookId} />}
      <SaveSubmit editing={editing} />
      {state.error && (
        <span className="pb-save-err" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

/* ------------------------------ share control ----------------------------- */
function ShareSubmit({ on }: { on: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn btn-sm ${on ? "btn-ghost" : "btn-primary"}`} type="submit" disabled={pending}>
      {pending ? "Updating…" : on ? "Stop sharing" : "Create share link"}
    </button>
  );
}

function ShareControl({
  notebookId,
  initialSlug,
  initialVisibility,
}: {
  notebookId: string;
  initialSlug: string | null;
  initialVisibility: "private" | "public";
}) {
  const { open, setOpen, ref } = usePopover();
  const [state, formAction] = useActionState(setNotebookShareAction, {
    shareSlug: initialSlug,
    visibility: initialVisibility,
  } as ShareState);
  const [copied, setCopied] = useState(false);

  const slug = state.shareSlug !== undefined ? state.shareSlug : initialSlug;
  const visibility = state.visibility ?? initialVisibility;
  const on = visibility === "public";
  const url = slug && typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : "";

  return (
    <div className="pb-pop-wrap" ref={ref}>
      <button className="btn btn-ghost btn-sm" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="share" size={14} /> Share{on && <span className="pb-share-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="pb-pop pb-pop-pad" role="dialog" aria-label="Share this prompt">
          <div className="pb-pop-head">Share this prompt</div>
          <p className="pb-pop-muted">
            {on
              ? "Anyone with the link can view a read-only copy."
              : "Create a public, read-only link to this prompt."}
          </p>
          <form action={formAction}>
            <input type="hidden" name="id" value={notebookId} />
            <input type="hidden" name="on" value={on ? "0" : "1"} />
            <ShareSubmit on={on} />
          </form>
          {on && url && (
            <div className="pb-share-link">
              <input readOnly value={url} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  void copyText(url).then((ok) => {
                    if (ok) {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1500);
                    }
                  });
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
          {state.error && <p className="pb-pop-err">{state.error}</p>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ history control --------------------------- */
function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SnapshotSubmit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-ghost btn-sm" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save a version"}
    </button>
  );
}

function HistoryControl({
  notebookId,
  name,
  doc,
  onRestore,
}: {
  notebookId: string;
  name: string;
  doc: BlockDoc;
  onRestore: (doc: BlockDoc) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const [versions, setVersions] = useState<NotebookVersion[] | null>(null);
  const [restoreState, restoreAction] = useActionState(restoreVersionAction, {} as RestoreState);
  const [snapState, snapAction] = useActionState(snapshotNotebookAction, {} as VersionSaveState);
  // Which version is awaiting a restore confirm (restore overwrites current work).
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(() => {
    setVersions(null);
    listVersionsAction(notebookId).then(setVersions);
  }, [notebookId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) setConfirmId(null);
  }, [open]);

  useEffect(() => {
    if (snapState.ok) load();
  }, [snapState.ok, load]);

  useEffect(() => {
    if (restoreState.doc) {
      onRestore(restoreState.doc);
      setOpen(false);
    }
  }, [restoreState.doc, onRestore, setOpen]);

  return (
    <div className="pb-pop-wrap" ref={ref}>
      <button className="btn btn-ghost btn-sm" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="clock" size={14} /> History
      </button>
      {open && (
        <div className="pb-pop pb-pop-pad" role="dialog" aria-label="Version history">
          <div className="pb-pop-head pb-pop-head-row">
            <span>Version history</span>
            <form action={snapAction}>
              <input type="hidden" name="id" value={notebookId} />
              <input type="hidden" name="name" value={name} />
              <input type="hidden" name="doc" value={JSON.stringify(doc)} />
              <SnapshotSubmit />
            </form>
          </div>
          {versions === null && <p className="pb-pop-muted">Loading…</p>}
          {versions !== null && versions.length === 0 && (
            <p className="pb-pop-muted">No versions yet. Snapshots are saved each time you save changes.</p>
          )}
          {versions !== null && versions.length > 0 && (
            <ul className="pb-versions">
              {versions.map((v) => (
                <li key={v.id}>
                  <span className="pb-version-when">{fmtWhen(v.createdAt)}</span>
                  {confirmId === v.id ? (
                    <form action={restoreAction}>
                      <input type="hidden" name="notebookId" value={notebookId} />
                      <input type="hidden" name="versionId" value={v.id} />
                      <button
                        className="pb-version-restore pb-danger"
                        type="submit"
                        title="Replaces the current prompt — unsaved edits are lost"
                      >
                        Replace current?
                      </button>
                    </form>
                  ) : (
                    <button
                      className="pb-version-restore"
                      type="button"
                      onClick={() => setConfirmId(v.id)}
                    >
                      Restore
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {restoreState.error && <p className="pb-pop-err">{restoreState.error}</p>}
        </div>
      )}
    </div>
  );
}

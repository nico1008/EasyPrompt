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
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildPromptFromBlocks, openInUrl } from "@/lib/buildPrompt";
import { analyzeDoc, type HealthStatus } from "@/lib/blocks/health";
import { MAX_NOTEBOOK_JSON } from "@/lib/blocks/schema";
import type { Block, BlockDoc } from "@/lib/blocks/types";
import { newBlockId } from "@/lib/blocks/defaults";
import { useNotebookDraft } from "@/lib/drafts/useNotebookDraft";
import { notebookDraftKey, serializeNotebookDraft } from "@/lib/drafts/notebookDraft";
import {
  createNotebookAction,
  overwriteTemplateAction,
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
import { Toast } from "@/components/Toast";
import { CodeWell } from "@/components/CodeWell";
import { AuthGatedButton, currentAuthNext } from "@/components/AuthGatedButton";
import { BuilderTitleField } from "./BuilderTitleField";
import { BlockCard } from "./BlockCard";
import { Outline } from "./Outline";
import { BlockPalette } from "./BlockPalette";
import { usePopover } from "./usePopover";
import type { PaletteEntry } from "@/lib/blocks/defaults";
import { CATEGORIES } from "@/data/templates";
import type { IconName } from "@/components/iconNames";
import { UnifiedTemplateFill } from "@/components/templates/UnifiedTemplateFill";
import { blockDocFromTemplateDocument, notebookTemplateDefinition } from "@/lib/templates/adapters";
import { parseTemplateDocument } from "@/lib/templates/schema";
import {
  listTemplateHistoryAction,
  restoreTemplateVersionAction,
  snapshotTemplateVersionAction,
  type TemplateHistoryItem,
} from "@/lib/templates/historyActions";

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

const CATEGORY_ICONS: Record<string, IconName> = {
  life: "house",
  writing: "letter",
  education: "book",
  work: "briefcase",
  marketing: "megaphone",
  creative: "star",
  code: "code",
};

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
  initialEditVersion,
  initialOutcome = "Fill the reusable inputs to generate a Prompt.",
  initialCategory = "work",
  initialIcon = "briefcase",
}: {
  initialDoc: BlockDoc;
  notebookId?: string;
  draftId?: string;
  /** Retained share slug when editing a saved prompt. Active only when public. */
  initialShareSlug?: string | null;
  initialVisibility?: "private" | "public";
  initialEditVersion?: number;
  initialOutcome?: string;
  initialCategory?: string;
  initialIcon?: IconName;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState<BlockDoc>(initialDoc);
  const [outcome, setOutcome] = useState(initialDoc.outcome ?? initialOutcome);
  const [category, setCategory] = useState(initialDoc.category ?? initialCategory);
  const [icon, setIcon] = useState<IconName>((initialDoc.icon as IconName | undefined) ?? initialIcon);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Narrow-screen view switch (the panes can't sit side-by-side under ~860px).
  const [mobileView, setMobileView] = useState<"outline" | "build" | "preview">("build");
  const [workspaceMode, setWorkspaceMode] = useState<"build" | "test">("build");
  const insertIndexRef = useRef<number>(0);
  // Save status (visibility of system status). New notebooks: the autosave-draft
  // outcome. Existing notebooks: dirty/saved vs the last save (snapshot below).
  const [draftStatus, setDraftStatus] = useState<"idle" | "saved" | "too-big">("idle");
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify({ doc: initialDoc, outcome: initialOutcome, category: initialCategory, icon: initialIcon }));
  const [cloudVersion, setCloudVersion] = useState(initialEditVersion);
  const [cloudStatus, setCloudStatus] = useState<"saved" | "saving" | "offline" | "failed" | "conflict">("saved");
  const [online, setOnline] = useState(true);
  const cloudSaveInFlight = useRef(false);

  const built = useMemo(() => buildPromptFromBlocks(doc), [doc]);
  const health = useMemo(() => analyzeDoc(doc, built), [doc, built]);
  const serializedDoc = useMemo(() => JSON.stringify(doc), [doc]);
  const localDraftDoc = useMemo<BlockDoc>(() => ({ ...doc, outcome, category, icon }), [category, doc, icon, outcome]);
  const editorSnapshot = useMemo(() => JSON.stringify({ doc, outcome, category, icon }), [category, doc, icon, outcome]);
  const saveError = serializedDoc.length > MAX_NOTEBOOK_JSON ? "This Template is too large to save." : null;

  /* Anonymous autosave — off in edit mode (the saved row is the source of truth). */
  const { clear: clearDraft } = useNotebookDraft({
    notebookId: notebookId ? `crash-${notebookId}` : draftId,
    enabled: notebookId === undefined || initialEditVersion !== undefined,
    restore: notebookId === undefined,
    doc: localDraftDoc,
    hasContent: built.answered > 0 || doc.title.trim().length > 0 || outcome.trim().length > 0,
    onRestore: (restored) => {
      setDoc(restored);
      if (restored.outcome !== undefined) setOutcome(restored.outcome);
      if (restored.category !== undefined) setCategory(restored.category);
      if (restored.icon !== undefined) setIcon(restored.icon as IconName);
    },
    onStatus: setDraftStatus,
  });

  // On a successful save, clear the draft and reset the dirty baseline.
  const markSaved = useCallback((snapshot?: string) => {
    clearDraft();
    setSavedSnapshot(snapshot ?? editorSnapshot);
  }, [clearDraft, editorSnapshot]);

  const dirty = notebookId !== undefined && editorSnapshot !== savedSnapshot;
  const tooBig = notebookId === undefined && draftStatus === "too-big";
  const legacySaveLabel =
    notebookId !== undefined
      ? dirty
        ? "Unsaved changes"
        : "Saved"
      : tooBig
        ? "Too long to autosave — save it to keep it"
        : draftStatus === "saved"
          ? "Draft saved"
          : null;
  const saveLabel = initialEditVersion !== undefined
    ? cloudStatus === "saving" ? "Saving…"
      : cloudStatus === "offline" ? "Offline · saved on this device"
      : cloudStatus === "failed" ? "Save failed"
      : cloudStatus === "conflict" ? "Conflict"
      : dirty ? "Unsaved changes" : "Saved"
    : legacySaveLabel;

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!notebookId || cloudVersion === undefined || !dirty || cloudStatus === "conflict" || cloudStatus === "failed") return;
    if (!online) {
      setCloudStatus("offline");
      return;
    }
    const handle = window.setTimeout(() => {
      if (cloudSaveInFlight.current) return;
      cloudSaveInFlight.current = true;
      setCloudStatus("saving");
      const snapshot = editorSnapshot;
      void (async () => {
        const retryDelays = [0, 2_000, 5_000, 15_000];
        let result: NotebookSaveState = {};
        for (const delay of retryDelays) {
          if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
          const payload = new FormData();
          payload.set("id", notebookId);
          payload.set("name", doc.title);
          payload.set("doc", serializedDoc);
          payload.set("outcome", outcome);
          payload.set("category", category);
          payload.set("icon", icon);
          payload.set("edit_version", String(cloudVersion));
          result = await updateNotebookAction({}, payload);
          if (result.ok || result.error?.includes("another session")) break;
        }
        cloudSaveInFlight.current = false;
        if (result.ok) {
          if (result.editVersion !== undefined) setCloudVersion(result.editVersion);
          markSaved(snapshot);
          setCloudStatus("saved");
        } else if (result.error?.includes("another session")) {
          setCloudStatus("conflict");
        } else {
          setCloudStatus(navigator.onLine ? "failed" : "offline");
        }
      })();
    }, 1_500);
    return () => window.clearTimeout(handle);
  }, [category, cloudStatus, cloudVersion, dirty, doc.title, editorSnapshot, icon, markSaved, notebookId, online, outcome, serializedDoc]);

  const overwriteConflict = useCallback(async () => {
    if (!notebookId || !window.confirm("Overwrite the server version? Its current state will be saved in History first.")) return;
    const payload = new FormData();
    payload.set("id", notebookId);
    payload.set("name", doc.title);
    payload.set("doc", serializedDoc);
    payload.set("outcome", outcome);
    payload.set("category", category);
    payload.set("icon", icon);
    const result = await overwriteTemplateAction({}, payload);
    if (!result.ok) {
      setCloudStatus("failed");
      return;
    }
    if (result.editVersion !== undefined) setCloudVersion(result.editVersion);
    markSaved(editorSnapshot);
    setCloudStatus("saved");
  }, [category, doc.title, editorSnapshot, icon, markSaved, notebookId, outcome, serializedDoc]);

  const saveConflictCopy = useCallback(async () => {
    const payload = new FormData();
    payload.set("name", `${doc.title || "Untitled Template"} (copy)`);
    payload.set("doc", serializedDoc);
    payload.set("outcome", outcome);
    payload.set("category", category);
    payload.set("icon", icon);
    const result = await createNotebookAction({}, payload);
    if (result.savedId) router.push(`/my/templates/${result.savedId}/edit`);
    else setCloudStatus("failed");
  }, [category, doc.title, icon, outcome, router, serializedDoc]);

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
    const serialized = serializeNotebookDraft(localDraftDoc);
    if (serialized) window.localStorage.setItem(notebookDraftKey(draftId), serialized);
  }, [built.answered, doc.title, draftId, localDraftDoc, notebookId, outcome]);

  if (workspaceMode === "test") {
    return (
      <UnifiedTemplateFill
        definition={notebookTemplateDefinition({
          id: notebookId ?? `draft-${draftId}`,
          name: doc.title || "Untitled Template",
          doc,
          visibility: initialVisibility,
          shareSlug: initialShareSlug,
          revisionId: notebookId ? `legacy-notebook-${notebookId}` : `draft-${draftId}`,
          canEdit: true,
          outcome,
          category,
          icon,
        })}
        breadcrumbs={[{ href: "/build", label: "Builder" }, { label: doc.title || "Untitled Template" }]}
        mode="test"
        onBackToBuild={() => setWorkspaceMode("build")}
      />
    );
  }

  return (
    <main className="pbuilder">
      <Toast show={Boolean(toast)} message={toast} />
      <h1 className="sr-only">Template builder</h1>

      <div className="pb-nav">
        <Breadcrumbs
          items={[
            { href: notebookId ? "/my" : "/build", label: notebookId ? "My Library" : "Builder" },
            { label: doc.title || (notebookId ? "Untitled template" : "New template") },
          ]}
        />
      </div>

      {/* ---- top toolbar ---- */}
      <header className="pb-toolbar">
        <div className="pb-toolbar-title">
          <BuilderTitleField
            kind="template"
            value={doc.title}
            placeholder="Untitled template"
            onValueChange={(title) => setDoc((current) => ({ ...current, title }))}
          />
        </div>
        <div className="pb-toolbar-actions">
          {saveLabel && (
            <span className={`pb-savestate${tooBig ? " alert" : ""}`} role="status">
              {saveLabel}
            </span>
          )}
          {notebookId && initialEditVersion !== undefined && (
            <CanonicalHistoryControl
              templateId={notebookId}
              onRestore={(restored, version, restoredMeta) => {
                setDoc(restored);
                setOutcome(restoredMeta.outcome);
                setCategory(restoredMeta.category);
                setIcon(restoredMeta.icon);
                setSavedSnapshot(JSON.stringify({ doc: restored, ...restoredMeta }));
                setCloudVersion(version);
                setCloudStatus("saved");
                flashToast("Version restored. Republish to update the public Template.");
              }}
            />
          )}
          {notebookId && initialEditVersion === undefined && (
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
              canPublish={initialEditVersion === undefined || (!dirty && cloudStatus === "saved")}
            />
          )}
          <ExportMenu text={built.text} onDownload={download} />
          {(notebookId === undefined || initialEditVersion === undefined) && (
            <SaveControl
              notebookId={notebookId}
              name={doc.title}
              doc={doc}
              snapshot={editorSnapshot}
              outcome={outcome}
              category={category}
              icon={icon}
              editVersion={cloudVersion}
              saved={notebookId !== undefined && !dirty}
              saveError={saveError}
              onSaved={markSaved}
              onCreated={(id) => router.push(`/my/templates/${id}`)}
              onAuthGateNavigate={persistDraftNow}
            />
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => void copy()} disabled={!built.text}>
            <Icon name="copy" size={14} strokeWidth={2} /> Copy
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setWorkspaceMode("test")}>
            <Icon name="review" size={14} strokeWidth={2} /> Test as user
          </button>
        </div>
      </header>

      {cloudStatus === "conflict" && (
        <div className="pb-conflict panel" role="alert">
          <div>
            <strong>This Template changed in another session.</strong>
            <span>Choose which version to keep. EasyPrompt will not merge block documents automatically.</span>
          </div>
          <div className="pb-conflict-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>Reload server version</button>
            <button className="btn btn-ghost btn-sm" onClick={() => void saveConflictCopy()}>Save as a copy</button>
            <button className="btn btn-primary btn-sm" onClick={() => void overwriteConflict()}>Overwrite with this version</button>
          </div>
        </div>
      )}
      {cloudStatus === "failed" && (
        <div className="pb-conflict panel" role="alert">
          <span>Cloud save failed. Your work is still saved on this device.</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setCloudStatus("saved")}>Retry</button>
        </div>
      )}

      {/* ---- narrow-screen view switch (≤860px; hidden on desktop) ---- */}
      <div className="pb-viewtoggle" role="group" aria-label="Builder view">
        <button type="button" aria-pressed="true" className="pb-viewtab on" onClick={() => setMobileView("build")}>Build</button>
        <button type="button" aria-pressed="false" className="pb-viewtab" onClick={() => setWorkspaceMode("test")}>Test</button>
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
          <details className="pb-template-details panel">
            <summary>Template details</summary>
            <p>These details explain the outcome and help people find the Template when you publish.</p>
            <div className="pb-template-details-grid">
              <label>
                <span>Outcome description</span>
                <textarea
                  className="textarea"
                  value={outcome}
                  maxLength={240}
                  rows={3}
                  placeholder="What will someone get after filling this Template?"
                  onChange={(event) => setOutcome(event.target.value)}
                />
              </label>
              <label>
                <span>Category</span>
                <select
                  className="select"
                  value={category}
                  onChange={(event) => {
                    const next = event.target.value;
                    setCategory(next);
                    setIcon(CATEGORY_ICONS[next] ?? "star");
                  }}
                >
                  {CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
            </div>
          </details>
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

function SaveSubmit({
  editing,
  saved,
  disabled,
}: {
  editing: boolean;
  saved: boolean;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  // Secondary (dark) so it doesn't compete with the indigo Copy primary.
  return (
    <button
      className="btn btn-ink btn-sm"
      type="submit"
      disabled={pending || saved || disabled}
      title={disabled ? "Add content or a reusable input first" : undefined}
    >
      {pending ? "Saving…" : saved ? "Saved" : editing ? "Save" : "Save template"}
    </button>
  );
}

function SaveControl({
  notebookId,
  name,
  doc,
  snapshot,
  outcome,
  category,
  icon,
  editVersion,
  saved,
  saveError,
  onSaved,
  onCreated,
  onAuthGateNavigate,
}: {
  notebookId?: string;
  name: string;
  doc: BlockDoc;
  snapshot: string;
  outcome: string;
  category: string;
  icon: IconName;
  editVersion?: number;
  saved: boolean;
  saveError: string | null;
  onSaved: (snapshot?: string) => void;
  onCreated: (id: string) => void;
  onAuthGateNavigate: () => void;
}) {
  const editing = Boolean(notebookId);
  const [state, formAction] = useActionState(editing ? updateNotebookAction : createNotebookAction, EMPTY_SAVE);
  const { account } = useSupabaseAccountState();
  const handledStateRef = useRef<NotebookSaveState | null>(null);
  const currentSnapshot = snapshot;
  const currentSnapshotRef = useRef(currentSnapshot);
  const submittedSnapshotRef = useRef<string | null>(null);
  currentSnapshotRef.current = currentSnapshot;
  const stateIsCurrent = submittedSnapshotRef.current === currentSnapshot;

  useEffect(() => {
    if (!state.ok || handledStateRef.current === state) return;
    handledStateRef.current = state;
    onSaved(submittedSnapshotRef.current ?? currentSnapshotRef.current);
    if (!editing && state.savedId) onCreated(state.savedId);
  }, [state, editing, onSaved, onCreated]);

  if (!isSupabaseConfigured()) return null;

  if (!account) {
    return (
      <AuthGatedButton
        className="btn btn-ink btn-sm"
        disabled={Boolean(saveError)}
        next={() => currentAuthNext("/build")}
        prompt={{
          title: "Save this template",
          body: "Create an account to save for later.",
        }}
        onBeforeAuthNavigate={onAuthGateNavigate}
      >
        {editing ? "Save" : "Save template"}
      </AuthGatedButton>
    );
  }

  return (
    <form
      action={formAction}
      className="pb-save-form"
      onSubmit={(e) => {
        if (saved) {
          e.preventDefault();
          return;
        }
        submittedSnapshotRef.current = currentSnapshot;
      }}
    >
      <input type="hidden" name="doc" value={JSON.stringify(doc)} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="outcome" value={outcome} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="icon" value={icon} />
      {editing && <input type="hidden" name="id" value={notebookId} />}
      {editing && editVersion !== undefined && <input type="hidden" name="edit_version" value={editVersion} />}
      <SaveSubmit editing={editing} saved={saved} disabled={Boolean(saveError)} />
      {stateIsCurrent && state.error && (
        <span className="pb-save-err" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

/* ------------------------------ share control ----------------------------- */
function ShareSubmit({ label, primary = false, disabled = false }: { label: "Publish" | "Republish" | "Unpublish"; primary?: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn btn-sm ${primary ? "btn-primary" : "btn-ghost"}`} type="submit" disabled={pending || disabled}>
      {pending ? "Updating…" : label}
    </button>
  );
}

function ShareControl({
  notebookId,
  initialSlug,
  initialVisibility,
  canPublish,
}: {
  notebookId: string;
  initialSlug: string | null;
  initialVisibility: "private" | "public";
  canPublish: boolean;
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
        <Icon name="share" size={14} /> Publish{on && <span className="pb-share-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="pb-pop pb-pop-pad" role="group" aria-label="Publish this Template">
          <div className="pb-pop-head">Publish Template</div>
          <p className="pb-pop-muted">
            {on
              ? "Public visitors use the pinned published revision. Draft edits stay private until Republish."
              : "Publish the tested revision and make it eligible for the community catalog."}
          </p>
          {!canPublish && <p className="pb-pop-err">Wait for the latest changes to save before publishing.</p>}
          {on ? (
            <div className="pb-conflict-actions">
              <form action={formAction}>
                <input type="hidden" name="id" value={notebookId} />
                <input type="hidden" name="on" value="1" />
                <ShareSubmit label="Republish" primary disabled={!canPublish} />
              </form>
              <form action={formAction}>
                <input type="hidden" name="id" value={notebookId} />
                <input type="hidden" name="on" value="0" />
                <ShareSubmit label="Unpublish" />
              </form>
            </div>
          ) : (
            <form action={formAction}>
              <input type="hidden" name="id" value={notebookId} />
              <input type="hidden" name="on" value="1" />
              <ShareSubmit label="Publish" primary disabled={!canPublish} />
            </form>
          )}
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
        <div className="pb-pop pb-pop-pad" role="group" aria-label="Version history">
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

function CanonicalHistoryControl({
  templateId,
  onRestore,
}: {
  templateId: string;
  onRestore: (doc: BlockDoc, editVersion: number, metadata: { outcome: string; category: string; icon: IconName }) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const [items, setItems] = useState<TemplateHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setItems(await listTemplateHistoryAction(templateId));
    setLoading(false);
  }, [templateId]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const snapshot = useCallback(async () => {
    setError("");
    const result = await snapshotTemplateVersionAction(templateId);
    if (!result.ok) setError(result.error ?? "Couldn't save this version.");
    else await refresh();
  }, [refresh, templateId]);

  const restore = useCallback(async (item: TemplateHistoryItem) => {
    if (!window.confirm(`Restore the version from ${new Date(item.created_at).toLocaleString()}?`)) return;
    setError("");
    const result = await restoreTemplateVersionAction(templateId, item.id);
    const parsed = parseTemplateDocument(result.document);
    if (!result.ok || !parsed.ok || result.editVersion === undefined) {
      setError(result.error ?? "Couldn't restore this version.");
      return;
    }
    onRestore(
      blockDocFromTemplateDocument(parsed.value, result.title ?? item.title),
      result.editVersion,
      {
        outcome: result.outcome ?? "",
        category: result.category ?? "work",
        icon: (result.icon ?? "briefcase") as IconName,
      }
    );
    setOpen(false);
  }, [onRestore, setOpen, templateId]);

  return (
    <div className="pb-pop-wrap" ref={ref}>
      <button className="btn btn-ghost btn-sm" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Icon name="clock" size={14} /> History
      </button>
      {open && (
        <div className="pb-pop pb-pop-pad" role="group" aria-label="Template version history">
          <div className="pb-pop-head"><strong>Version history</strong></div>
          <button className="btn btn-ghost btn-sm" onClick={() => void snapshot()}>Save a version</button>
          {loading ? <p className="pb-pop-empty">Loading…</p> : items.length ? (
            <ul className="pb-version-list">
              {items.map((item) => (
                <li key={item.id}>
                  <span><strong>{item.label || item.reason.replaceAll("_", " ")}</strong><small>{new Date(item.created_at).toLocaleString()}</small></span>
                  <button className="btn btn-ghost btn-sm" onClick={() => void restore(item)}>Restore</button>
                </li>
              ))}
            </ul>
          ) : <p className="pb-pop-empty">No saved versions yet.</p>}
          {error && <p className="pb-save-err" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}

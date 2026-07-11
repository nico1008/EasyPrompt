"use client";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { CreatorChip } from "@/components/CreatorChip";
import { CrosshairCard } from "@/components/CrosshairCard";
import { FieldControl } from "@/components/FieldControl";
import { Icon } from "@/components/Icon";
import { MarkdownEditorSurface } from "@/components/builder/MarkdownEditorSurface";
import { ProviderOpenActions, type ProviderOpenLinks } from "@/components/detail/ProviderOpenActions";
import { SavePromptButton } from "@/components/SavePromptButton";
import { Toast } from "@/components/Toast";
import { UsesBadge } from "@/components/UsesBadge";
import { copyText } from "@/lib/clipboard";
import { buildPromptFromBlocks, openInUrl } from "@/lib/buildPrompt";
import type { BlockDoc, VariableBlock } from "@/lib/blocks/types";
import type { CommunityAuthor } from "@/lib/community/map";
import { trackUse, trackView } from "@/lib/metrics/track";

function blankCommunityDoc(doc: BlockDoc): BlockDoc {
  return {
    ...doc,
    blocks: doc.blocks.map((block) =>
      block.kind === "variable" ? { ...block, value: "" } : { ...block }
    ),
  };
}

export function CommunityBlockTemplateRunner({
  slug,
  title,
  doc: initialDoc,
  author,
}: {
  slug: string;
  title: string;
  doc: BlockDoc;
  author: CommunityAuthor | null;
}) {
  const [doc, setDoc] = useState(() => blankCommunityDoc(initialDoc));
  const [customBody, setCustomBody] = useState<string | null>(null);
  const [view, setView] = useState<"form" | "prompt">("form");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(false);
  const built = useMemo(() => buildPromptFromBlocks(doc), [doc]);
  const effectiveText = customBody ?? built.text;
  const variables = doc.blocks.filter(
    (block): block is VariableBlock => block.kind === "variable" && block.enabled
  );
  const answered = variables.filter((block) => block.value.trim()).length;
  const tokens = Math.max(1, Math.ceil(effectiveText.length / 4));
  const kb = (new TextEncoder().encode(effectiveText).length / 1024).toFixed(1);
  const target = useMemo(() => ({ kind: "user_template" as const, key: slug }), [slug]);

  useEffect(() => trackView(target), [target]);

  const setVariable = useCallback((id: string, value: string) => {
    setDoc((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.kind === "variable" && block.id === id ? { ...block, value } : block
      ),
    }));
  }, []);

  const copy = useCallback(async () => {
    if (!effectiveText || !(await copyText(effectiveText))) return;
    trackUse(target, "copy");
    setCopied(true);
    setToast(true);
    window.setTimeout(() => setCopied(false), 1600);
    window.setTimeout(() => setToast(false), 2200);
  }, [effectiveText, target]);

  const providerLinks: ProviderOpenLinks = {
    chatgpt: { href: openInUrl("chatgpt", effectiveText), onClick: () => trackUse(target, "open_chatgpt") },
    claude: { href: openInUrl("claude", effectiveText), onClick: () => trackUse(target, "open_claude") },
    gemini: { href: openInUrl("gemini", effectiveText), onClick: () => trackUse(target, "open_gemini") },
  };

  return (
    <main className="builder-page tpl-dual community-block-template">
      <Toast show={toast} message="Prompt copied to clipboard" />
      <div className="tpl-topbar">
        <div className="tpl-topbar-left">
          <Breadcrumbs items={[{ href: "/templates", label: "Templates" }, { label: title }]} />
        </div>
        <div className="tpl-topbar-meta">
          {author && <CreatorChip creator={{ kind: "community", author }} />}
          <BookmarkButton compact target={{ kind: "user_template", key: slug }} />
        </div>
      </div>

      <div className="tpl-seg" role="tablist" aria-label="Switch view">
        <button role="tab" aria-selected={view === "form"} className={`tpl-seg-btn${view === "form" ? " on" : ""}`} onClick={() => setView("form")}>
          Form
        </button>
        <button role="tab" aria-selected={view === "prompt"} className={`tpl-seg-btn${view === "prompt" ? " on" : ""}`} onClick={() => setView("prompt")}>
          Prompt
        </button>
      </div>

      <div className="tpl-grid" data-view={view}>
        <CrosshairCard as="section" className="tpl-col-form">
          <header className="tpl-head">
            <div className="icon-tile"><Icon name="list" size={22} /></div>
            <div>
              <h1>{title}</h1>
              <p>Fill the reusable inputs below. This Template always opens blank.</p>
            </div>
          </header>
          <div className="progress-block">
            <div className="progress" aria-hidden="true">
              {variables.map((block) => <div key={block.id} className={`bar${block.value.trim() ? " on" : ""}`} />)}
            </div>
            <div className="progress-meta">
              <span><b>{answered} of {variables.length}</b> answered</span>
              <span>{variables.length === answered ? "ready to copy" : "fill what matters"}</span>
            </div>
          </div>
          <div className="blocks">
            {variables.length > 0 ? variables.map((block) => (
              <div className="block" key={block.id}>
                <FieldControl field={block.field} value={block.value} onText={setVariable} />
              </div>
            )) : (
              <div className="community-template-note">
                This Template has no variable fields. Review and edit the Prompt before using it.
              </div>
            )}
          </div>
        </CrosshairCard>

        <aside className="tpl-col-prompt" aria-label="Generated prompt">
          <div className="tpl-prompt-actions">
            <span className="tpl-mode is-synced">
              <span className="tpl-mode-dot" aria-hidden="true" />
              {customBody === null ? "Synced with form" : "Edited · form changes paused"}
            </span>
            <div className="tpl-prompt-buttons">
              <ProviderOpenActions links={providerLinks} compact />
              <button className="btn btn-primary btn-sm" onClick={() => void copy()} disabled={!effectiveText}>
                <Icon name={copied ? "check" : "copy"} size={14} /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="tpl-prompt-scroll">
            <MarkdownEditorSurface
              value={effectiveText}
              onChange={setCustomBody}
              fileName={`${slug}.md`}
              tokens={tokens}
              kb={kb}
              tag="✎ editable"
              placeholder="Your Prompt builds here as you fill the form."
              ariaLabel="Generated prompt (editable markdown)"
              className="tpl-md"
            />
          </div>
          <div className="tpl-save">
            <SavePromptButton
              source={{ kind: "community", slug }}
              answers={{ fields: {}, checks: {} }}
              defaultName={title}
              customBody={effectiveText}
              variant="outline"
            />
            <UsesBadge target={target} />
          </div>
        </aside>
      </div>

      <div className="tpl-mobilebar">
        <button className="btn btn-ghost btn-sm" onClick={() => setView(view === "form" ? "prompt" : "form")}>
          {view === "form" ? "View Prompt" : "View form"}
        </button>
        <button className="btn btn-primary" onClick={() => void copy()} disabled={!effectiveText}>
          <Icon name={copied ? "check" : "copy"} size={15} /> {copied ? "Copied" : "Copy Prompt"}
        </button>
      </div>
    </main>
  );
}

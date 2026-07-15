"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Folder, FolderPlus, Search, Settings2, SlidersHorizontal } from "lucide-react";
import { Icon } from "@/components/Icon";
import { BookmarkButton } from "@/components/BookmarkButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LibraryActionDialog } from "@/components/library/LibraryActionDialog";
import { objectMeta } from "@/lib/library/objectMeta";
import { searchLibrary, type LibrarySearchType, type LibrarySort, type SearchableLibraryItem } from "@/lib/library/search";
import type { LibraryFilter, LibraryItem } from "@/lib/library/list";
import type { BookmarkTarget } from "@/lib/bookmarks/schema";
import type { LibraryWorkspace, LibraryWorkspaceItem } from "@/lib/workspaces/repo";
import { createWorkspaceAction, deleteWorkspaceAction, renameWorkspaceAction, setWorkspaceItemAction } from "@/lib/workspaces/actions";

export type LibraryBrowserItem = SearchableLibraryItem & {
  href: string;
  icon: LibraryItem["icon"];
  visibility: LibraryItem["visibility"] | null;
  ownedItem: LibraryItem | null;
  favoriteTarget: BookmarkTarget | null;
};

const FILTERS: { id: LibrarySearchType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "template", label: "Templates" },
  { id: "prompt", label: "Prompts" },
  { id: "workflow", label: "Workflows" },
  { id: "favorite", label: "Favorites" },
];
const PAGE_SIZE = 48;
const EMPTY_KEYS: ReadonlySet<string> = new Set();

function initialType(filter: LibraryFilter): LibrarySearchType {
  if (filter === "templates") return "template";
  if (filter === "prompts") return "prompt";
  if (filter === "workflows") return "workflow";
  if (filter === "favorites") return "favorite";
  return "all";
}

function LibraryModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="library-modal"
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="library-modal-card">
        <header className="library-modal-head">
          <div>
            <span>Workspace</span>
            <h2>{title}</h2>
          </div>
          <button type="button" className="library-modal-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

function ItemCard({ item, onManage, onOrganize }: {
  item: LibraryBrowserItem;
  onManage: () => void;
  onOrganize: () => void;
}) {
  const meta = objectMeta(item.objectType);
  return (
    <article className={`my-card-tile is-${item.objectType}`}>
      <div className="mct-bar">
        <span className="mct-glyph" aria-hidden="true"><Icon name={meta.icon} size={14} /></span>
        <h3 className="mct-title">
          <Link className="mct-link" href={item.href}>{item.title}</Link>
        </h3>
        <span className="mct-card-actions">
          {item.visibility === "public" ? <span className="my-visibility my-visibility-public mct-status">Public</span> : null}
          {item.favoriteTarget ? <span className="mct-fav"><BookmarkButton compact target={item.favoriteTarget} /></span> : null}
          <button type="button" className="mct-manage" onClick={onOrganize} aria-label={`Add ${item.title} to a workspace`}>
            <FolderPlus size={15} strokeWidth={1.8} aria-hidden="true" />
          </button>
          {item.ownedItem ? (
            <button type="button" className="mct-manage" onClick={onManage} aria-label={`Manage ${item.title}`}>
              <Settings2 size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
          ) : null}
        </span>
      </div>
      <div className="mct-body">{item.preview ? <p className="mct-blurb">{item.preview}</p> : null}</div>
      <div className="mct-foot">
        <span className="mct-meta">{item.meta}</span>
        {item.isFavorite ? <span className="mct-kind">Favorite</span> : null}
      </div>
    </article>
  );
}

export function LibraryBrowser({ items, workspaces, memberships, initialFilter }: {
  items: LibraryBrowserItem[];
  workspaces: LibraryWorkspace[];
  memberships: LibraryWorkspaceItem[];
  initialFilter: LibraryFilter;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [type, setType] = useState<LibrarySearchType>(() => initialType(initialFilter));
  const [sort, setSort] = useState<LibrarySort>("recent");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageWorkspaceId, setManageWorkspaceId] = useState<string | null>(null);
  const [activeManageKey, setActiveManageKey] = useState<string | null>(null);
  const [activeOrganizeKey, setActiveOrganizeKey] = useState<string | null>(null);
  const [membershipState, setMembershipState] = useState(() => memberships);
  const [notice, setNotice] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [pending, startTransition] = useTransition();

  useEffect(() => setMembershipState(memberships), [memberships]);
  useEffect(() => {
    if (workspaceId && !workspaces.some((workspace) => workspace.id === workspaceId)) setWorkspaceId(null);
  }, [workspaceId, workspaces]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((event.key === "/" && !typing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const membershipMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const membership of membershipState) {
      const keys = map.get(membership.workspace_id) ?? new Set<string>();
      keys.add(membership.item_key);
      map.set(membership.workspace_id, keys);
    }
    return map;
  }, [membershipState]);
  const itemByKey = useMemo(() => new Map(items.map((item) => [item.key, item])), [items]);
  const libraryKeys = useMemo(() => new Set(itemByKey.keys()), [itemByKey]);
  const typeCounts = useMemo(() => {
    const counts = { all: items.length, template: 0, prompt: 0, workflow: 0, favorite: 0 };
    for (const item of items) {
      counts[item.objectType] += 1;
      if (item.isFavorite) counts.favorite += 1;
    }
    return counts;
  }, [items]);
  const workspaceCount = (id: string) => {
    let count = 0;
    for (const key of membershipMap.get(id) ?? []) if (libraryKeys.has(key)) count += 1;
    return count;
  };

  const workspaceKeys = useMemo(
    () => workspaceId ? membershipMap.get(workspaceId) ?? EMPTY_KEYS : null,
    [membershipMap, workspaceId]
  );
  const visible = useMemo(() => searchLibrary(items, {
    query: deferredQuery,
    type,
    sort,
    workspaceItemKeys: workspaceKeys,
  }), [deferredQuery, items, sort, type, workspaceKeys]);
  const displayed = visible.slice(0, visibleLimit);

  useEffect(() => setVisibleLimit(PAGE_SIZE), [deferredQuery, sort, type, workspaceId]);
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || visibleLimit >= visible.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleLimit((current) => Math.min(current + PAGE_SIZE, visible.length));
      }
    }, { rootMargin: "360px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [visible.length, visibleLimit]);

  const activeOwned = activeManageKey ? itemByKey.get(activeManageKey)?.ownedItem ?? null : null;
  const activeOrganize = activeOrganizeKey ? itemByKey.get(activeOrganizeKey) ?? null : null;
  const activeWorkspace = workspaces.find((workspace) => workspace.id === manageWorkspaceId) ?? null;

  const chooseType = (next: LibrarySearchType) => {
    setType(next);
    setWorkspaceId(null);
    const legacy = next === "template" ? "templates" : next === "prompt" ? "prompts" : next === "workflow" ? "workflows" : next === "favorite" ? "favorites" : null;
    window.history.replaceState(null, "", legacy ? `/my?filter=${legacy}` : "/my");
  };

  const toggleMembership = (targetWorkspaceId: string, itemKey: string, included: boolean) => {
    const before = membershipState;
    setMembershipState((current) => included
      ? [...current, { workspace_id: targetWorkspaceId, owner_id: "optimistic", item_key: itemKey, created_at: new Date().toISOString() }]
      : current.filter((entry) => !(entry.workspace_id === targetWorkspaceId && entry.item_key === itemKey)));
    setNotice(null);
    const formData = new FormData();
    formData.set("workspaceId", targetWorkspaceId);
    formData.set("itemKey", itemKey);
    formData.set("included", String(included));
    startTransition(async () => {
      const result = await setWorkspaceItemAction(formData);
      if (result.error) {
        setMembershipState(before);
        setNotice(result.error);
      }
    });
  };

  return (
    <div className="library-shell">
      <aside className="library-sidebar" aria-label="Library navigation">
        <div className="library-side-group">
          <span className="library-side-label">Library</span>
          {FILTERS.map((filter) => (
            <button key={filter.id} type="button" className={`library-side-row${!workspaceId && type === filter.id ? " is-active" : ""}`} onClick={() => chooseType(filter.id)}>
              <span>{filter.label}</span>
              <span>{typeCounts[filter.id]}</span>
            </button>
          ))}
        </div>
        <div className="library-side-group library-workspaces">
          <div className="library-side-title">
            <span className="library-side-label">Workspaces</span>
            <button type="button" onClick={() => setCreateOpen(true)} aria-label="New workspace"><Icon name="plus" size={14} /></button>
          </div>
          {workspaces.length === 0 ? <p className="library-no-workspaces">Group related items into focused spaces.</p> : null}
          {workspaces.map((workspace) => (
            <div key={workspace.id} className={`library-workspace-row${workspaceId === workspace.id ? " is-active" : ""}`}>
              <button type="button" className="library-workspace-select" onClick={() => { setWorkspaceId(workspace.id); setType("all"); }}>
                <Folder size={15} strokeWidth={1.7} aria-hidden="true" />
                <span>{workspace.name}</span>
                <small>{workspaceCount(workspace.id)}</small>
              </button>
              <button type="button" className="library-workspace-more" onClick={() => setManageWorkspaceId(workspace.id)} aria-label={`Manage ${workspace.name}`}>
                <Icon name="more" size={14} />
              </button>
            </div>
          ))}
          <button type="button" className="library-new-workspace" onClick={() => setCreateOpen(true)}><FolderPlus size={15} /> New workspace</button>
        </div>
      </aside>

      <section className="library-results" aria-label="Library items">
        <div className="library-commandbar">
          <label className="library-search">
            <span className="sr-only">Search your library</span>
            <Search size={18} strokeWidth={1.8} aria-hidden="true" />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, content, categories..." />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="x" size={14} /></button> : <kbd>Ctrl K</kbd>}
          </label>
          <label className="library-sort">
            <SlidersHorizontal size={15} aria-hidden="true" />
            <span className="sr-only">Sort library</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as LibrarySort)}>
              <option value="recent">Recently edited</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>

        <div className="library-mobile-filters" aria-label="Content type">
          {FILTERS.map((filter) => <button key={filter.id} type="button" className={!workspaceId && type === filter.id ? "is-active" : ""} onClick={() => chooseType(filter.id)}>{filter.label}</button>)}
        </div>

        <div className="library-results-head">
          <div>
            <h2>{workspaceId ? workspaces.find((workspace) => workspace.id === workspaceId)?.name : query ? "Search results" : FILTERS.find((filter) => filter.id === type)?.label}</h2>
            <p>{visible.length} {visible.length === 1 ? "item" : "items"}{query ? ` matching “${query}”` : ""}</p>
          </div>
          {workspaceId ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWorkspaceId(null)}>Show all</button> : null}
        </div>

        {visible.length > 0 ? (
          <div className="my-grid library-grid-results">
            {displayed.map((item) => <ItemCard key={item.key} item={item} onManage={() => setActiveManageKey(item.key)} onOrganize={() => setActiveOrganizeKey(item.key)} />)}
          </div>
        ) : (
          <div className="library-zero">
            <span><Search size={22} /></span>
            <h3>{query ? "No close matches" : workspaceId ? "This workspace is empty" : "Nothing here yet"}</h3>
            <p>{query ? "Try fewer words or search by category." : workspaceId ? "Use the folder button on any item to add it here." : "Create or favorite an item to start your library."}</p>
            {query ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuery("")}>Clear search</button> : null}
          </div>
        )}
        {visibleLimit < visible.length ? (
          <button ref={loadMoreRef} type="button" className="library-load-more" onClick={() => setVisibleLimit((current) => current + PAGE_SIZE)}>
            Load more <span>{visible.length - visibleLimit} remaining</span>
          </button>
        ) : null}
      </section>

      {activeOwned ? <LibraryActionDialog key={activeOwned.key} item={activeOwned} onClose={() => setActiveManageKey(null)} /> : null}

      {activeOrganize ? (
        <LibraryModal title={`Organize ${activeOrganize.title}`} onClose={() => { setActiveOrganizeKey(null); setNotice(null); }}>
          <div className="workspace-assign-list">
            {workspaces.length === 0 ? <p>Create a workspace first, then add this item.</p> : workspaces.map((workspace) => {
              const checked = membershipMap.get(workspace.id)?.has(activeOrganize.key) ?? false;
              return (
                <label key={workspace.id} className="workspace-assign-row">
                  <span><Folder size={16} /><strong>{workspace.name}</strong></span>
                  <input type="checkbox" checked={checked} disabled={pending} onChange={(event) => toggleMembership(workspace.id, activeOrganize.key, event.target.checked)} />
                </label>
              );
            })}
          </div>
          {notice ? <p className="library-form-error" role="alert">{notice}</p> : null}
          <footer className="library-modal-foot">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setActiveOrganizeKey(null); setCreateOpen(true); }}>New workspace</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setActiveOrganizeKey(null)}>Done</button>
          </footer>
        </LibraryModal>
      ) : null}

      {createOpen ? (
        <WorkspaceCreateModal onClose={() => setCreateOpen(false)} />
      ) : null}

      {activeWorkspace ? (
        <WorkspaceManageModal workspace={activeWorkspace} onClose={() => setManageWorkspaceId(null)} />
      ) : null}
    </div>
  );
}

function WorkspaceCreateModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <LibraryModal title="Create workspace" onClose={onClose}>
      <form className="workspace-form" onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const data = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await createWorkspaceAction({}, data);
          if (result.error) setError(result.error);
          else onClose();
        });
      }}>
        <label><span>Name</span><input name="name" required maxLength={60} autoFocus placeholder="Client launches" /></label>
        <p>Use workspaces for projects, clients, or recurring tasks.</p>
        {error ? <p className="library-form-error" role="alert">{error}</p> : null}
        <footer className="library-modal-foot"><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Creating..." : "Create workspace"}</button></footer>
      </form>
    </LibraryModal>
  );
}

function WorkspaceManageModal({ workspace, onClose }: { workspace: LibraryWorkspace; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <LibraryModal title="Workspace settings" onClose={onClose}>
      <form className="workspace-form" onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await renameWorkspaceAction({}, data);
          if (result.error) setError(result.error);
          else onClose();
        });
      }}>
        <input type="hidden" name="workspaceId" value={workspace.id} />
        <label><span>Name</span><input name="name" required maxLength={60} defaultValue={workspace.name} /></label>
        {error ? <p className="library-form-error" role="alert">{error}</p> : null}
        <footer className="library-modal-foot"><button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving..." : "Save name"}</button></footer>
      </form>
      <div className="workspace-danger">
        <div><strong>Delete workspace</strong><p>Items stay in your library.</p></div>
        <form action={deleteWorkspaceAction} onSubmit={onClose}><input type="hidden" name="workspaceId" value={workspace.id} /><ConfirmButton label="Delete workspace" confirmLabel="Confirm delete" /></form>
      </div>
    </LibraryModal>
  );
}

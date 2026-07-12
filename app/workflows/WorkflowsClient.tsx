"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { WorkflowCard } from "@/components/WorkflowCard";
import {
  WORKFLOWS,
  workflowCategories,
  workflowCategoryLabel,
  workflowCountFor,
  workflowToolMix,
} from "@/data/workflows";
import { useCatalogUrlState } from "@/lib/browse/useCatalogUrlState";

type Sort = "popular" | "new" | "az";

const URL_DEFAULTS = { q: "", category: "all", sort: "popular" };

const CATEGORY_ICONS: Record<string, IconName> = {
  life: "meal",
  writing: "letter",
  education: "teacher",
  work: "briefcase",
  marketing: "chart",
  creative: "star",
  code: "code",
};

export function WorkflowsClient({
  initialQuery = "",
  initialCategory = "all",
}: {
  initialQuery?: string;
  initialCategory?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<Sort>("popular");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [urlReady, setUrlReady] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const cat = params.get("category");
    const sortParam = params.get("sort");
    if (q) setQuery(q);
    if (cat && workflowCategories().some((c) => c.id === cat)) setCategory(cat);
    if (sortParam === "new" || sortParam === "az") setSort(sortParam);
    setUrlReady(true);
  }, []);

  const urlValues = useMemo(
    () => ({ q: query, category, sort }),
    [category, query, sort]
  );
  useCatalogUrlState({ ready: urlReady, values: urlValues, defaults: URL_DEFAULTS });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    let list = [...WORKFLOWS];
    if (category !== "all") list = list.filter((workflow) => workflow.category === category);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((workflow) => {
        const mix = workflowToolMix(workflow);
        return [
          workflow.title,
          workflow.blurb,
          workflow.overview,
          workflowCategoryLabel(workflow.category),
          workflow.timeLabel,
          mix.label,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
    }

    return list.sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      if (sort === "new") return (b.added ?? 0) - (a.added ?? 0);
      if (a.popular !== b.popular) return a.popular ? -1 : 1;
      return (b.added ?? 0) - (a.added ?? 0);
    });
  }, [category, query, sort]);

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setFiltersOpen(false);
  }

  const cats = workflowCategories();
  const activeFilterCount = category !== "all" ? 1 : 0;

  return (
    <main className="picker-page workflows-page">
      <div className="wrap">
        <div className="page-head">
          <span className="lib-tag">~/workflows</span>
          <h1>Guided playbooks for bigger work.</h1>
          <p>
            Use a Workflow when one prompt is not enough and you need a practical sequence
            of steps.
          </p>
        </div>

        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={18} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workflows… try 'job application' or 'landing page'"
              aria-label="Search workflows"
            />
            <span className="k">{isMac ? "⌘K" : "Ctrl K"}</span>
          </div>
          <div className="sort" role="group" aria-label="Sort">
            <button
              className={sort === "popular" ? "on" : undefined}
              aria-pressed={sort === "popular"}
              onClick={() => setSort("popular")}
            >
              Popular
            </button>
            <button
              className={sort === "new" ? "on" : undefined}
              aria-pressed={sort === "new"}
              onClick={() => setSort("new")}
            >
              New
            </button>
            <button
              className={sort === "az" ? "on" : undefined}
              aria-pressed={sort === "az"}
              onClick={() => setSort("az")}
            >
              A–Z
            </button>
          </div>
        </div>

        <div className="filter-mobile-bar">
          <button
            type="button"
            className={`filter-toggle${filtersOpen ? " on" : ""}`}
            aria-expanded={filtersOpen}
            aria-controls="workflow-filter-panel"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Icon name="list" size={15} />
            Filters
            {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && (
            <button type="button" className="filter-clear" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        <div className="layout">
          <aside
            className={`side filter-panel${filtersOpen ? " open" : ""}`}
            id="workflow-filter-panel"
          >
            <div className="group">Browse by</div>
            <button
              className={category === "all" ? "on" : undefined}
              onClick={() => {
                setCategory("all");
                setFiltersOpen(false);
              }}
            >
              <span>All workflows</span>
              <span className="ct">{workflowCountFor("all")}</span>
            </button>
            {cats.map((cat) => (
              <button
                key={cat.id}
                className={category === cat.id ? "on" : undefined}
                onClick={() => {
                  setCategory(cat.id);
                  setFiltersOpen(false);
                }}
              >
                <Icon name={CATEGORY_ICONS[cat.id] ?? "book"} size={15} />
                {cat.label}
                <span className="ct">{workflowCountFor(cat.id)}</span>
              </button>
            ))}
          </aside>

          <div className="results-region">
            <div className="results-head" aria-live="polite">
              <div>
                <h2>{results.length} {results.length === 1 ? "Workflow" : "Workflows"}</h2>
                <p>{activeFilterCount > 0 || query.trim() ? "Filtered results" : "Guided work, step by step"}</p>
              </div>
              <span>{sort === "az" ? "A–Z" : sort === "new" ? "Newest first" : "Popular first"}</span>
            </div>
            <div className="grid">
              {results.length === 0 ? (
                <EmptyWorkflows query={query} onClear={clearFilters} />
              ) : (
                results.map((workflow) => (
                  <WorkflowCard key={workflow.id} workflow={workflow} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function EmptyWorkflows({ query, onClear }: { query: string; onClear: () => void }) {
  const msg = query.trim()
    ? `No workflows match "${query.trim()}".`
    : "Nothing matches these filters.";

  return (
    <div className="empty">
      {msg}{" "}
      <button type="button" className="empty-clear" onClick={onClear}>
        Clear filters
      </button>
      .
    </div>
  );
}

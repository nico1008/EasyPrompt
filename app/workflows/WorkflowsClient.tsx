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
import {
  CatalogControls,
  CatalogMenu,
  CatalogMenuSection,
} from "@/components/catalog/CatalogControls";

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
    setCategory("all");
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
          <CatalogControls activeCount={activeFilterCount} onClear={clearFilters}>
            <CatalogMenu label="Category" icon="list" activeCount={category !== "all" ? 1 : 0}>
              <CatalogMenuSection>
                <button role="menuitemradio" aria-checked={category === "all"} onClick={() => setCategory("all")}>
                  <Icon name="list" size={15} /> All Workflows <span className="ct">{workflowCountFor("all")}</span>
                </button>
                {cats.map((cat) => (
                  <button key={cat.id} role="menuitemradio" aria-checked={category === cat.id} onClick={() => setCategory(cat.id)}>
                    <Icon name={CATEGORY_ICONS[cat.id] ?? "book"} size={15} /> {cat.label}
                    <span className="ct">{workflowCountFor(cat.id)}</span>
                  </button>
                ))}
              </CatalogMenuSection>
            </CatalogMenu>
            <CatalogMenu label="Sort" valueLabel={sort === "az" ? "A–Z" : sort === "new" ? "Newest" : "Popular"} icon="heading">
              <CatalogMenuSection>
                <button role="menuitemradio" aria-checked={sort === "popular"} onClick={() => setSort("popular")}>
                  <Icon name="star" size={15} /> Popular
                </button>
                <button role="menuitemradio" aria-checked={sort === "new"} onClick={() => setSort("new")}>
                  <Icon name="clock" size={15} /> Newest
                </button>
                <button role="menuitemradio" aria-checked={sort === "az"} onClick={() => setSort("az")}>
                  <Icon name="heading" size={15} /> A–Z
                </button>
              </CatalogMenuSection>
            </CatalogMenu>
          </CatalogControls>
        </div>

        <div className="grid">
              {results.length === 0 ? (
                <EmptyWorkflows query={query} onClear={() => { setQuery(""); clearFilters(); }} />
              ) : (
                results.map((workflow) => (
                  <WorkflowCard key={workflow.id} workflow={workflow} />
                ))
              )}
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

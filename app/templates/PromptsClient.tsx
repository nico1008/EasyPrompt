"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, TEMPLATES } from "@/data/templates";
import { TemplateCard } from "@/components/TemplateCard";
import { Icon, type IconName } from "@/components/Icon";
import { fetchCountsBatch } from "@/lib/metrics/client";
import type { Counts, CountsRecord } from "@/lib/metrics/map";
import type { Aggregate, AggregateRecord } from "@/lib/ratings/map";
import { fetchCommunityTemplates } from "@/lib/community/client";
import type { CommunityCard as CommunityCardModel } from "@/lib/community/map";
import { fetchCategoryAffinity } from "@/lib/personalization/client";
import { affinityScore } from "@/lib/personalization/affinity";
import { catalogTemplateToItem, communityTemplateToItem, byOriginThenRecency } from "@/lib/browse/map";
import { useCatalogUrlState } from "@/lib/browse/useCatalogUrlState";

type Sort = "foryou" | "popular" | "new" | "az";
type Filter = "none" | "top" | "small" | "fresh";
type Source = "all" | "official" | "community";

const URL_DEFAULTS = { q: "", category: "all", source: "all", sort: "popular", filter: "none" };

/* Sidebar icon per category — keeps the picker on the Icon system instead of
   mixing emoji into an otherwise stroked-icon UI. */
const CATEGORY_ICONS: Record<string, IconName> = {
  life: "meal",
  writing: "letter",
  education: "teacher",
  work: "briefcase",
  marketing: "chart",
  creative: "star",
  code: "code",
};

function countsRecordToMap(record: CountsRecord): Map<string, Counts> {
  return new Map(Object.entries(record));
}

function aggregateRecordToMap(record: AggregateRecord): Map<string, Aggregate> {
  return new Map(Object.entries(record));
}

export function PromptsClient({
  initialCounts = {},
  initialCommunity = [],
  initialCommunityUses = {},
  initialRatings = {},
  initialQuery = "",
  initialCategory = "all",
}: {
  initialCounts?: CountsRecord;
  initialCommunity?: CommunityCardModel[];
  initialCommunityUses?: CountsRecord;
  initialRatings?: AggregateRecord;
  initialQuery?: string;
  initialCategory?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string>(initialCategory);
  const [sort, setSort] = useState<Sort>("popular");
  const [filter, setFilter] = useState<Filter>("none");
  const [source, setSource] = useState<Source>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [urlReady, setUrlReady] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [counts, setCounts] = useState<Map<string, Counts>>(() => countsRecordToMap(initialCounts));
  const [countsLoaded, setCountsLoaded] = useState(true);
  const [community, setCommunity] = useState<CommunityCardModel[]>(initialCommunity);
  const [communityUses, setCommunityUses] = useState<Map<string, Counts>>(() =>
    countsRecordToMap(initialCommunityUses)
  );
  const [communityLoaded, setCommunityLoaded] = useState(true);
  const [communityError, setCommunityError] = useState(false);
  const [communityRetry, setCommunityRetry] = useState(0);
  const [ratings] = useState<Map<string, Aggregate>>(() => aggregateRecordToMap(initialRatings));
  const [affinity, setAffinity] = useState<Map<string, number>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  // Category affinity from the signed-in user's own library (empty when logged out).
  useEffect(() => {
    let active = true;
    void fetchCategoryAffinity().then((m) => {
      if (active) setAffinity(m);
    });
    return () => {
      active = false;
    };
  }, []);

  // Real "Uses" counts for every template, in one batch RPC (no per-card N+1).
  useEffect(() => {
    let active = true;
    void fetchCountsBatch(
      "catalog",
      TEMPLATES.map((t) => t.slug)
    ).then((m) => {
      if (active) {
        setCounts(m);
        setCountsLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Public community Templates (+ their Uses), hydrated client-side. Empty-safe.
  useEffect(() => {
    let active = true;
    setCommunityError(false);
    void fetchCommunityTemplates(24, 0)
      .then(async (cards) => {
        if (!active) return;
        setCommunity(cards);
        if (cards.length) {
          const m = await fetchCountsBatch(
            "user_template",
            cards.map((c) => c.slug)
          );
          if (active) setCommunityUses(m);
        }
        if (active) setCommunityLoaded(true);
      })
      .catch(() => {
        if (active) setCommunityError(true);
      });
    return () => {
      active = false;
    };
  }, [communityRetry]);

  // Show the platform-correct shortcut hint (⌘K on Mac, Ctrl K elsewhere).
  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
  }, []);

  // ⌘K / Ctrl+K focuses search.
  useEffect(() => {
    // Read URL filters after mount without useSearchParams(), which would make
    // the statically-rendered catalog fall back to client-only rendering.
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const cat = params.get("category");
    const sourceParam = params.get("source");
    const sortParam = params.get("sort");
    const filterParam = params.get("filter");
    if (q) setQuery(q);
    if (cat && CATEGORIES.some((c) => c.id === cat)) setCategory(cat);
    if (sourceParam === "official" || sourceParam === "community") setSource(sourceParam);
    if (sortParam === "foryou" || sortParam === "new" || sortParam === "az") setSort(sortParam);
    if (filterParam === "top" || filterParam === "small" || filterParam === "fresh") setFilter(filterParam);
    setUrlReady(true);
  }, []);

  const urlValues = useMemo(
    () => ({ q: query, category, source, sort, filter }),
    [category, filter, query, sort, source]
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

  // One unified list: curated (house) + public community templates on par.
  const allItems = useMemo(
    () => [...TEMPLATES.map(catalogTemplateToItem), ...community.map(communityTemplateToItem)],
    [community]
  );

  const countItems = useMemo(() => {
    if (source === "all") return allItems;
    const origin = source === "official" ? "house" : "community";
    return allItems.filter((item) => item.origin === origin);
  }, [allItems, source]);

  function countForCategory(categoryId: string | "all") {
    return categoryId === "all"
      ? countItems.length
      : countItems.filter((item) => item.category === categoryId).length;
  }

  const results = useMemo(() => {
    let list = [...allItems];

    if (source !== "all") {
      const want = source === "official" ? "house" : "community";
      list = list.filter((i) => i.origin === want);
    }
    if (category !== "all") list = list.filter((i) => i.category === category);

    // Curatorial filters describe the official catalog — they apply to house items.
    if (filter === "top") list = list.filter((i) => i.origin === "house" && i.popular);
    if (filter === "small")
      list = list.filter((i) => i.origin === "house" && i.questionCount != null && i.questionCount <= 4);
    if (filter === "fresh") list = list.filter((i) => i.origin === "house" && i.recency >= 4);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((i) =>
        [i.title, i.blurb, i.tag, i.category ?? ""].join(" ").toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sort === "foryou") {
        const d = affinityScore(affinity, b.category ?? "") - affinityScore(affinity, a.category ?? "");
        if (d !== 0) return d;
        return byOriginThenRecency(a, b);
      }
      if (sort === "az") return a.title.localeCompare(b.title);
      if (sort === "new") return byOriginThenRecency(a, b);
      // popular: house first, then the popular flag, then true recency
      if (a.origin !== b.origin) return a.origin === "house" ? -1 : 1;
      if (a.popular !== b.popular) return a.popular ? -1 : 1;
      return b.recency - a.recency;
    });
  }, [allItems, source, category, filter, query, sort, affinity]);

  function usesFor(origin: "house" | "community", slug: string): number | undefined {
    if (origin === "house") return countsLoaded ? counts.get(slug)?.uses ?? 0 : undefined;
    return communityLoaded ? communityUses.get(slug)?.uses ?? 0 : undefined;
  }

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setSource("all");
    setFilter("none");
    setFiltersOpen(false);
  }

  const activeFilterCount =
    (category !== "all" ? 1 : 0) + (source !== "all" ? 1 : 0) + (filter !== "none" ? 1 : 0);

  return (
    <main className="picker-page">
      <div className="wrap">
        <div className="page-head">
          <span className="lib-tag">~/templates</span>
          <h1>Pick a starting point.</h1>
          <p>
            Pick a ready-made template, answer a few short questions, and get a
            polished prompt.
          </p>
        </div>

        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={18} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you trying to make today? Try 'cover letter' or 'meal plan'…"
              aria-label="Search templates"
            />
            <span className="k">{isMac ? "⌘K" : "Ctrl K"}</span>
          </div>
          <div className="sort" role="group" aria-label="Sort">
            {affinity.size > 0 && (
              <button
                className={sort === "foryou" ? "on" : undefined}
                aria-pressed={sort === "foryou"}
                onClick={() => setSort("foryou")}
              >
                For you
              </button>
            )}
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
              Curated first
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
            aria-controls="template-filter-panel"
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
          <aside className={`side filter-panel${filtersOpen ? " open" : ""}`} id="template-filter-panel">
            <div className="group">Browse by</div>
            <button
              className={category === "all" ? "on" : undefined}
              onClick={() => {
                setCategory("all");
                setFiltersOpen(false);
              }}
            >
              <span>All templates</span>
              <span className="ct">{countForCategory("all")}</span>
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={category === c.id ? "on" : undefined}
                onClick={() => {
                  setCategory(c.id);
                  setFiltersOpen(false);
                }}
              >
                <Icon name={CATEGORY_ICONS[c.id] ?? "star"} size={15} />
                {c.label}
                <span className="ct">{countForCategory(c.id)}</span>
              </button>
            ))}
            <div className="group">Source</div>
            {(["all", "official", "community"] as const).map((s) => (
              <button
                key={s}
                className={source === s ? "on" : undefined}
                aria-pressed={source === s}
                onClick={() => {
                  setSource(s);
                  setFiltersOpen(false);
                }}
              >
                <Icon name={s === "community" ? "users" : s === "official" ? "shield" : "list"} size={15} />
                <span>{s === "all" ? "All sources" : s === "official" ? "Official" : "Community"}</span>
              </button>
            ))}
            <div className="group">Filter</div>
            <button
              className={filter === "top" ? "on" : undefined}
              aria-pressed={filter === "top"}
              onClick={() => {
                setFilter((f) => (f === "top" ? "none" : "top"));
                setFiltersOpen(false);
              }}
            >
              <Icon name="star" size={15} />
              <span>Top rated</span>
            </button>
            <button
              className={filter === "small" ? "on" : undefined}
              aria-pressed={filter === "small"}
              onClick={() => {
                setFilter((f) => (f === "small" ? "none" : "small"));
                setFiltersOpen(false);
              }}
            >
              <Icon name="zap" size={15} />
              <span>Under 5 fields</span>
            </button>
            <button
              className={filter === "fresh" ? "on" : undefined}
              aria-pressed={filter === "fresh"}
              onClick={() => {
                setFilter((f) => (f === "fresh" ? "none" : "fresh"));
                setFiltersOpen(false);
              }}
            >
              <Icon name="clock" size={15} />
              <span>Added this week</span>
            </button>
          </aside>

          <div>
            <div className="grid">
              {communityError && source === "community" && community.length === 0 ? (
                <CommunityLoadError onRetry={() => setCommunityRetry((value) => value + 1)} />
              ) : results.length === 0 ? (
                <EmptyTemplates query={query} source={source} onClear={clearFilters} />
              ) : (
                results.map((item) => (
                  <TemplateCard
                    key={item.key}
                    item={item}
                    uses={usesFor(item.origin, item.slug)}
                    rating={ratings.get(item.slug)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* Filter-aware empty state — never a bare grid. */
function CommunityLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="empty" role="alert">
      Community Templates could not load.{" "}
      <button type="button" className="empty-clear" onClick={onRetry}>
        Retry
      </button>
      .
    </div>
  );
}

function EmptyTemplates({
  query,
  source,
  onClear,
}: {
  query: string;
  source: Source;
  onClear: () => void;
}) {
  const msg = query.trim()
    ? `No templates match “${query.trim()}”.`
    : source === "community"
      ? "No public community templates yet."
      : source === "official"
        ? "No official templates here — try All sources."
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

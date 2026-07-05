"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "@/data/templates";
import { EXAMPLE_PROMPTS, promptCountFor } from "@/data/prompts";
import { PromptCard } from "@/components/PromptCard";
import { Icon, type IconName } from "@/components/Icon";
import { fetchCountsBatch } from "@/lib/metrics/client";
import type { Counts, CountsRecord } from "@/lib/metrics/map";
import { fetchCommunityPrompts } from "@/lib/community/client";
import type { CommunityCard as CommunityCardModel } from "@/lib/community/map";
import { examplePromptToItem, communityPromptToItem, byOriginThenRecency } from "@/lib/browse/map";

type Sort = "popular" | "new" | "az";
type Source = "all" | "official" | "community";

/* Sidebar icon per category — same vocabulary as the Templates picker so the two
   libraries read as one system. */
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

export function PromptsLibraryClient({
  initialCounts = {},
  initialCommunity = [],
  initialCommunityUses = {},
  initialQuery = "",
  initialCategory = "all",
}: {
  initialCounts?: CountsRecord;
  initialCommunity?: CommunityCardModel[];
  initialCommunityUses?: CountsRecord;
  initialQuery?: string;
  initialCategory?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string>(initialCategory);
  const [sort, setSort] = useState<Sort>("popular");
  const [source, setSource] = useState<Source>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [counts, setCounts] = useState<Map<string, Counts>>(() => countsRecordToMap(initialCounts));
  const [countsLoaded, setCountsLoaded] = useState(true);
  const [community, setCommunity] = useState<CommunityCardModel[]>(initialCommunity);
  const [communityUses, setCommunityUses] = useState<Map<string, Counts>>(() =>
    countsRecordToMap(initialCommunityUses)
  );
  const [communityLoaded, setCommunityLoaded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
  }, []);

  // Real "Uses" counts for every example prompt, in one batch RPC.
  useEffect(() => {
    let active = true;
    void fetchCountsBatch(
      "example_prompt",
      EXAMPLE_PROMPTS.map((p) => p.slug)
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

  // Public community Prompts (+ their Uses), hydrated client-side so the page
  // stays static. Empty-safe when nobody has made one public yet.
  useEffect(() => {
    let active = true;
    void fetchCommunityPrompts(24, 0).then(async (cards) => {
      if (!active) return;
      setCommunity(cards);
      if (cards.length) {
        const m = await fetchCountsBatch(
          "user_prompt",
          cards.map((c) => c.slug)
        );
        if (active) setCommunityUses(m);
      }
      if (active) setCommunityLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // ⌘K / Ctrl+K focuses search.
  useEffect(() => {
    // Read URL filters after mount without useSearchParams(), which would make
    // the statically-rendered catalog fall back to client-only rendering.
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const cat = params.get("category");
    if (q) setQuery(q);
    if (cat && CATEGORIES.some((c) => c.id === cat)) setCategory(cat);
  }, []);

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

  // One unified list: curated (house) + public community prompts on par.
  const results = useMemo(() => {
    const house = EXAMPLE_PROMPTS.map(examplePromptToItem);
    const comm = community.map(communityPromptToItem);
    let list = [...house, ...comm];

    if (source !== "all") {
      const want = source === "official" ? "house" : "community";
      list = list.filter((i) => i.origin === want);
    }
    if (category !== "all") list = list.filter((i) => i.category === category);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((i) =>
        [i.title, i.blurb, i.tag, i.category ?? ""].join(" ").toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      if (sort === "new") return byOriginThenRecency(a, b);
      // popular: house first, then the popular flag, then true recency
      if (a.origin !== b.origin) return a.origin === "house" ? -1 : 1;
      if (a.popular !== b.popular) return a.popular ? -1 : 1;
      return b.recency - a.recency;
    });
  }, [community, source, category, query, sort]);

  function usesFor(origin: "house" | "community", slug: string): number | undefined {
    if (origin === "house") return countsLoaded ? counts.get(slug)?.uses ?? 0 : undefined;
    return communityLoaded ? communityUses.get(slug)?.uses ?? 0 : undefined;
  }

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setSource("all");
    setFiltersOpen(false);
  }

  const activeFilterCount = (category !== "all" ? 1 : 0) + (source !== "all" ? 1 : 0);

  // Only show categories that actually contain curated prompts.
  const cats = CATEGORIES.filter((c) => promptCountFor(c.id) > 0);

  return (
    <main className="picker-page prompts-theme">
      <div className="wrap">
        <div className="page-head">
          <span className="lib-tag">~/prompts</span>
          <h1>Ready to paste, right now.</h1>
          <p>
            Finished prompts you can copy as-is — or customize one to fit your situation.
          </p>
        </div>

        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={18} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prompts… try 'cover letter' or 'meal plan'"
              aria-label="Search prompts"
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
            aria-controls="prompt-filter-panel"
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
          <aside className={`side filter-panel${filtersOpen ? " open" : ""}`} id="prompt-filter-panel">
            <div className="group">Browse by</div>
            <button
              className={category === "all" ? "on" : undefined}
              onClick={() => {
                setCategory("all");
                setFiltersOpen(false);
              }}
            >
              <span>All prompts</span>
              <span className="ct">{promptCountFor("all")}</span>
            </button>
            {cats.map((c) => (
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
                <span className="ct">{promptCountFor(c.id)}</span>
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
          </aside>

          <div>
            <div className="grid">
              {results.length === 0 ? (
                <EmptyPrompts query={query} source={source} onClear={clearFilters} />
              ) : (
                results.map((item) => (
                  <PromptCard key={item.key} item={item} uses={usesFor(item.origin, item.slug)} />
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
function EmptyPrompts({
  query,
  source,
  onClear,
}: {
  query: string;
  source: Source;
  onClear: () => void;
}) {
  const msg = query.trim()
    ? `No prompts match “${query.trim()}”.`
    : source === "community"
      ? "No public community prompts yet."
      : source === "official"
        ? "No official prompts here — try All sources."
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

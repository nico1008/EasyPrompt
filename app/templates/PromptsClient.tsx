"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES, TEMPLATES, countFor } from "@/data/templates";
import { TemplateCard } from "@/components/TemplateCard";
import { Icon, type IconName } from "@/components/Icon";
import { fetchCountsBatch } from "@/lib/metrics/client";
import type { Counts } from "@/lib/metrics/map";
import { fetchCommunityTemplates } from "@/lib/community/client";
import type { CommunityCard as CommunityCardModel } from "@/lib/community/map";
import { fetchCategoryAffinity } from "@/lib/personalization/client";
import { affinityScore } from "@/lib/personalization/affinity";
import { catalogTemplateToItem, communityTemplateToItem, byOriginThenRecency } from "@/lib/browse/map";

type Sort = "foryou" | "popular" | "new" | "az";
type Filter = "none" | "top" | "small" | "fresh";
type Source = "all" | "official" | "community";

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

export function PromptsClient() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [filter, setFilter] = useState<Filter>("none");
  const [source, setSource] = useState<Source>("all");
  const [isMac, setIsMac] = useState(false);
  const [counts, setCounts] = useState<Map<string, Counts>>(new Map());
  const [countsLoaded, setCountsLoaded] = useState(false);
  const [community, setCommunity] = useState<CommunityCardModel[]>([]);
  const [communityUses, setCommunityUses] = useState<Map<string, Counts>>(new Map());
  const [communityLoaded, setCommunityLoaded] = useState(false);
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

  // Published community Templates (+ their Uses), hydrated client-side. Empty-safe.
  useEffect(() => {
    let active = true;
    void fetchCommunityTemplates(24, 0).then(async (cards) => {
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
    });
    return () => {
      active = false;
    };
  }, []);

  // Show the platform-correct shortcut hint (⌘K on Mac, Ctrl K elsewhere).
  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
  }, []);

  // Seed state from the URL (footer category links, landing chips).
  useEffect(() => {
    const q = params.get("q");
    const cat = params.get("category");
    if (q) setQuery(q);
    if (cat && CATEGORIES.some((c) => c.id === cat)) setCategory(cat);
  }, [params]);

  // ⌘K / Ctrl+K focuses search.
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

  // One unified list: curated (house) + published (community) templates on par.
  const results = useMemo(() => {
    const house = TEMPLATES.map(catalogTemplateToItem);
    const comm = community.map(communityTemplateToItem);
    let list = [...house, ...comm];

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
  }, [community, source, category, filter, query, sort, affinity]);

  function usesFor(origin: "house" | "community", slug: string): number | undefined {
    if (origin === "house") return countsLoaded ? counts.get(slug)?.uses ?? 0 : undefined;
    return communityLoaded ? communityUses.get(slug)?.uses ?? 0 : undefined;
  }

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setSource("all");
    setFilter("none");
  }

  return (
    <main className="picker-page">
      <div className="wrap">
        <div className="page-head">
          <span className="lib-tag">~/templates</span>
          <h1>Pick a starting point.</h1>
          <p>
            Pick a ready-made template, answer a few short questions, and get a
            polished prompt for ChatGPT, Claude, or Gemini.
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

        <div className="layout">
          <aside className="side">
            <div className="group">Browse by</div>
            <button
              className={category === "all" ? "on" : undefined}
              onClick={() => setCategory("all")}
            >
              <span>All templates</span>
              <span className="ct">{countFor("all")}</span>
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={category === c.id ? "on" : undefined}
                onClick={() => setCategory(c.id)}
              >
                <Icon name={CATEGORY_ICONS[c.id] ?? "star"} size={15} />
                {c.label}
                <span className="ct">{countFor(c.id)}</span>
              </button>
            ))}
            <div className="group">Source</div>
            {(["all", "official", "community"] as const).map((s) => (
              <button
                key={s}
                className={source === s ? "on" : undefined}
                aria-pressed={source === s}
                onClick={() => setSource(s)}
              >
                <Icon name={s === "community" ? "users" : s === "official" ? "shield" : "list"} size={15} />
                <span>{s === "all" ? "All sources" : s === "official" ? "Official" : "Community"}</span>
              </button>
            ))}
            <div className="group">Filter</div>
            <button
              className={filter === "top" ? "on" : undefined}
              aria-pressed={filter === "top"}
              onClick={() => setFilter((f) => (f === "top" ? "none" : "top"))}
            >
              <Icon name="star" size={15} />
              <span>Top rated</span>
            </button>
            <button
              className={filter === "small" ? "on" : undefined}
              aria-pressed={filter === "small"}
              onClick={() => setFilter((f) => (f === "small" ? "none" : "small"))}
            >
              <Icon name="zap" size={15} />
              <span>Under 5 fields</span>
            </button>
            <button
              className={filter === "fresh" ? "on" : undefined}
              aria-pressed={filter === "fresh"}
              onClick={() => setFilter((f) => (f === "fresh" ? "none" : "fresh"))}
            >
              <Icon name="clock" size={15} />
              <span>Added this week</span>
            </button>
          </aside>

          <div>
            <div className="grid">
              {results.length === 0 ? (
                <EmptyTemplates query={query} source={source} onClear={clearFilters} />
              ) : (
                results.map((item) => (
                  <TemplateCard key={item.key} item={item} uses={usesFor(item.origin, item.slug)} />
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
      ? "No community templates have been published yet."
      : source === "official"
        ? "No official templates here — try All sources."
        : "Nothing matches these filters.";
  return (
    <div className="empty">
      {msg}{" "}
      <button
        onClick={onClear}
        style={{
          background: "none",
          border: "none",
          color: "var(--accent)",
          font: "inherit",
          cursor: "pointer",
          padding: 0,
        }}
      >
        clear filters
      </button>
      .
    </div>
  );
}

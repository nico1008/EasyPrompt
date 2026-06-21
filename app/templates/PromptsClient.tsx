"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CATEGORIES,
  TEMPLATES,
  countFor,
  displayTitle,
} from "@/data/templates";
import type { Template } from "@/data/types";
import { TemplateCard } from "@/components/TemplateCard";
import { Icon, type IconName } from "@/components/Icon";

type Sort = "popular" | "new" | "az";
type Filter = "none" | "top" | "small" | "fresh";

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

/* "12.4k" -> 12400 for numeric sorting. */
function usesToNumber(uses: string): number {
  const n = parseFloat(uses);
  return uses.toLowerCase().includes("k") ? n * 1000 : n;
}

export function PromptsClient() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [filter, setFilter] = useState<Filter>("none");
  const [isMac, setIsMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show the platform-correct shortcut hint (⌘K on Mac, Ctrl K elsewhere).
  // Defaults to the non-Mac label so SSR and first client render agree.
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: Template[] = TEMPLATES.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (filter === "top" && !t.popular) return false;
      if (filter === "small" && t.fields.length > 4) return false;
      if (filter === "fresh" && (t.added ?? 0) < 4) return false;
      if (!q) return true;
      const hay = [
        displayTitle(t),
        t.blurb,
        t.tag,
        t.category,
        t.seo_title,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sort === "az") return displayTitle(a).localeCompare(displayTitle(b));
      if (sort === "new") return (b.added ?? 0) - (a.added ?? 0);
      // popular: popular flag first, then uses desc
      if (a.popular !== b.popular) return a.popular ? -1 : 1;
      return usesToNumber(b.uses) - usesToNumber(a.uses);
    });
    return list;
  }, [query, category, sort, filter]);

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
                <div className="empty">
                  No templates match <b>“{query}”</b>. Try a different search or{" "}
                  <button
                    onClick={() => {
                      setQuery("");
                      setCategory("all");
                      setFilter("none");
                    }}
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
              ) : (
                results.map((t) => <TemplateCard key={t.id} t={t} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

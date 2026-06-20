"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/data/templates";
import { EXAMPLE_PROMPTS, promptCountFor, type ExamplePrompt } from "@/data/prompts";
import { PromptCard } from "@/components/PromptCard";
import { Icon, type IconName } from "@/components/Icon";

type Sort = "popular" | "new" | "az";

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

export function PromptsLibraryClient() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [isMac, setIsMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
  }, []);

  // Seed state from the URL (landing links, category deep-links).
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
    let list: ExamplePrompt[] = EXAMPLE_PROMPTS.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      const hay = [p.title, p.blurb, p.tag, p.category].join(" ").toLowerCase();
      return hay.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      if (sort === "new") return (b.added ?? 0) - (a.added ?? 0);
      // popular: popular flag first, then newest
      if (Boolean(a.popular) !== Boolean(b.popular)) return a.popular ? -1 : 1;
      return (b.added ?? 0) - (a.added ?? 0);
    });
    return list;
  }, [query, category, sort]);

  // Only show categories that actually contain example prompts.
  const cats = CATEGORIES.filter((c) => promptCountFor(c.id) > 0);

  return (
    <main className="picker-page prompts-theme">
      <div className="wrap">
        <div className="page-head">
          <span className="prompts-eyebrow">~/prompts</span>
          <h1>Ready to paste, right now.</h1>
          <p>
            Finished prompts you can copy as-is — or customize one to fit your situation.
            Each is written to work with ChatGPT, Claude, or Gemini.
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

        <div className="layout">
          <aside className="side">
            <div className="group">Browse by</div>
            <button
              className={category === "all" ? "on" : undefined}
              onClick={() => setCategory("all")}
            >
              <span>All prompts</span>
              <span className="ct">{promptCountFor("all")}</span>
            </button>
            {cats.map((c) => (
              <button
                key={c.id}
                className={category === c.id ? "on" : undefined}
                onClick={() => setCategory(c.id)}
              >
                <Icon name={CATEGORY_ICONS[c.id] ?? "star"} size={15} />
                {c.label}
                <span className="ct">{promptCountFor(c.id)}</span>
              </button>
            ))}
          </aside>

          <div>
            <div className="grid">
              {results.length === 0 ? (
                <div className="empty">
                  No prompts match <b>“{query}”</b>. Try a different search or{" "}
                  <button
                    onClick={() => {
                      setQuery("");
                      setCategory("all");
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
                results.map((p) => <PromptCard key={p.id} p={p} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
